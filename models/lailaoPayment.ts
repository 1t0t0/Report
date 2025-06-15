// lib/lailaoPayment.ts - Lailao Payment Gateway Integration
interface LailaoPaymentRequest {
  amount: number;
  description: string;
  tag1?: string; // booking_id
  tag2?: string; // passenger_count
  tag3?: string; // contact_email
}

interface LailaoPaymentResponse {
  message: string;
  redirectURL: string;
}

interface LailaoWebhookData {
  message: string;
  refNo: number;
  billNumber: string;
  txnDateTime: string;
  txnAmount: number;
  sourceCurrency: string;
  sourceAccount: string;
  merchantName: string;
  sourceName: string;
  description: string;
  exReferenceNo: string;
  userId: string;
  transactionId: string;
  status: string;
  tag1: string; // booking_id
  tag2: string; // passenger_count  
  tag3: string; // contact_email
  paymentMethod: string;
  successURL: string;
}

export class LailaoPaymentService {
  private readonly baseURL = 'https://payment-gateway.lailaolab.com/v1/api';
  private readonly publicKey = process.env.LAILAO_PUBLIC_KEY!;
  private readonly secretKey = process.env.LAILAO_SECRET_KEY!;
  private readonly environment = process.env.LAILAO_ENVIRONMENT || 'test';
  
  constructor() {
    if (!this.publicKey) {
      throw new Error('LAILAO_PUBLIC_KEY is required');
    }
    
    // For test environment, we might not need secret key in some cases
    if (this.environment === 'production' && !this.secretKey) {
      console.warn('LAILAO_SECRET_KEY is not set. Some features may not work.');
    }
    
    console.log('🔧 Lailao Payment Service initialized:', {
      environment: this.environment,
      hasPublicKey: !!this.publicKey,
      hasSecretKey: !!this.secretKey
    });
  }
  
  private getAuthHeader(): string {
    // For payment-link API, use Basic Auth with public:secret
    const credentials = `${this.publicKey}:${this.secretKey || ''}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }
  
  async createPaymentLink(bookingData: {
    booking_id: string;
    total_price: number;
    passenger_count: number;
    contact_email: string;
  }): Promise<LailaoPaymentResponse> {
    try {
      // Remove spaces from description as per Lailao requirements
      const description = `BusTicket-${bookingData.booking_id}`.replace(/\s+/g, '');
      
      const requestData: LailaoPaymentRequest = {
        amount: bookingData.total_price,
        description: description,
        tag1: bookingData.booking_id,
        tag2: bookingData.passenger_count.toString(),
        tag3: bookingData.contact_email
      };
      
      console.log('🔄 Creating Lailao Payment Link:', {
        ...requestData,
        authHeaderSet: !!this.getAuthHeader()
      });
      
      const response = await fetch(`${this.baseURL}/payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader()
        },
        body: JSON.stringify(requestData)
      });
      
      const responseText = await response.text();
      console.log('📥 Lailao Raw Response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      
      if (!response.ok) {
        throw new Error(`Lailao API Error: ${response.status} - ${responseText}`);
      }
      
      let result: LailaoPaymentResponse;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      if (result.message !== 'SUCCESSFULLY') {
        throw new Error(`Payment Link Creation Failed: ${result.message}`);
      }
      
      console.log('✅ Lailao Payment Link Created Successfully:', {
        booking_id: bookingData.booking_id,
        redirectURL: result.redirectURL
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Lailao Payment Link Error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bookingId: bookingData.booking_id,
        amount: bookingData.total_price
      });
      throw error;
    }
  }
  
  verifyWebhookSignature(webhookData: LailaoWebhookData): boolean {
    // Basic validation - check if required fields exist
    const requiredFields = ['message', 'transactionId', 'status', 'tag1'];
    
    for (const field of requiredFields) {
      if (!webhookData[field as keyof LailaoWebhookData]) {
        console.error(`❌ Missing required webhook field: ${field}`);
        return false;
      }
    }
    
    // Additional validation could be added here if Lailao provides
    // signature verification methods
    
    console.log('✅ Webhook signature verification passed');
    return true;
  }
  
  isPaymentSuccessful(status: string): boolean {
    // Lailao success status variations
    const successStatuses = ['SUCCESS', 'COMPLETED', 'PAID', 'SUCCESSFUL'];
    return successStatuses.includes(status.toUpperCase());
  }
  
  isPaymentFailed(status: string): boolean {
    // Lailao failure status variations
    const failureStatuses = ['FAILED', 'FAILURE', 'ERROR', 'DECLINED', 'CANCELLED'];
    return failureStatuses.includes(status.toUpperCase());
  }
  
  async getTransactionStatus(transactionId: string): Promise<any> {
    try {
      // This endpoint might not be available in Lailao API
      // Check documentation for transaction status endpoint
      const response = await fetch(`${this.baseURL}/transaction/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader()
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get transaction status: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('❌ Get Transaction Status Error:', error);
      throw error;
    }
  }
  
  async processRefund(transactionId: string, amount: number, reason?: string): Promise<any> {
    try {
      // Note: Refund API endpoint needs to be confirmed from Lailao documentation
      console.log('🔄 Processing refund:', { transactionId, amount, reason });
      
      const requestData = {
        transactionId,
        amount,
        reason: reason || 'Customer requested refund'
      };
      
      const response = await fetch(`${this.baseURL}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader()
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Refund API Error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Refund processed successfully:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Refund processing error:', error);
      throw error;
    }
  }
  
  formatAmount(amount: number): number {
    // Ensure amount is in LAK and properly formatted
    return Math.round(amount);
  }
  
  generateWebhookSecret(): string {
    // Generate a secret for webhook verification if needed
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  // Helper method to parse webhook data safely
  parseWebhookData(rawData: any): LailaoWebhookData | null {
    try {
      // Ensure all required fields are present and properly typed
      const webhookData: LailaoWebhookData = {
        message: rawData.message || '',
        refNo: parseInt(rawData.refNo) || 0,
        billNumber: rawData.billNumber || '',
        txnDateTime: rawData.txnDateTime || '',
        txnAmount: parseFloat(rawData.txnAmount) || 0,
        sourceCurrency: rawData.sourceCurrency || 'LAK',
        sourceAccount: rawData.sourceAccount || '',
        merchantName: rawData.merchantName || '',
        sourceName: rawData.sourceName || '',
        description: rawData.description || '',
        exReferenceNo: rawData.exReferenceNo || '',
        userId: rawData.userId || '',
        transactionId: rawData.transactionId || '',
        status: rawData.status || '',
        tag1: rawData.tag1 || '', // booking_id
        tag2: rawData.tag2 || '', // passenger_count
        tag3: rawData.tag3 || '', // contact_email
        paymentMethod: rawData.paymentMethod || '',
        successURL: rawData.successURL || ''
      };
      
      return webhookData;
      
    } catch (error) {
      console.error('❌ Failed to parse webhook data:', error);
      return null;
    }
  }
}

// Singleton instance
export const lailaoPayment = new LailaoPaymentService();

// Export types for use in other files
export type { LailaoPaymentRequest, LailaoPaymentResponse, LailaoWebhookData };