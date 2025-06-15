// lib/emailService.ts - Email Service using Nodemailer for Next.js 15
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { IBooking } from '@/models/Booking';

// Email Configuration Interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// QR Data Interface
interface QRData {
  ticketNumber: string;
  ticketType: 'group' | 'individual';
  passengerCount: number;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor() {
    // Initialize email configuration
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    this.fromEmail = process.env.FROM_EMAIL || 'Bus Ticket System <noreply@busticketsystem.com>';

    // Create transporter
    this.transporter = nodemailer.createTransporter(emailConfig);

    // Verify connection on initialization
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      // Don't throw error here to avoid breaking the app initialization
    }
  }

  // Generate QR Code as base64 string
  private async generateQRCode(qrData: QRData): Promise<string> {
    try {
      const qrString = JSON.stringify(qrData);
      
      const qrCodeDataURL = await QRCode.toDataURL(qrString, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      // Remove the data URL prefix to get pure base64
      return qrCodeDataURL.split(',')[1];
    } catch (error) {
      console.error('❌ QR Code generation failed:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  // Create email template for QR code
  private createQREmailTemplate(bookingData: IBooking, qrCodeBase64: string): string {
    return `
      <!DOCTYPE html>
      <html lang="lo">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ຢືນຢັນການຈອງຕັ້ວ</title>
        <style>
          body { 
            font-family: 'Phetsarath', Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5;
            line-height: 1.6;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 10px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #3B82F6, #1E40AF);
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
          }
          .booking-id {
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            margin-top: 10px;
            font-weight: bold;
          }
          .content { 
            padding: 30px; 
          }
          .greeting {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
          }
          .booking-details { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #3B82F6;
          }
          .booking-details h3 {
            margin-top: 0;
            color: #3B82F6;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: bold;
            color: #555;
          }
          .value {
            color: #333;
          }
          .qr-section { 
            text-align: center; 
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
          }
          .qr-code { 
            max-width: 200px; 
            border: 2px solid #ddd; 
            border-radius: 8px;
            margin: 20px 0;
          }
          .important-note {
            background: #fef3cd; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid #fbbf24;
            margin: 20px 0;
          }
          .important-note h4 {
            margin-top: 0;
            color: #d97706;
          }
          .important-note ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #666;
            border-top: 1px solid #eee;
          }
          .footer p {
            margin: 5px 0;
          }
          .price {
            color: #059669;
            font-weight: bold;
            font-size: 18px;
          }
          @media (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 5px;
            }
            .content {
              padding: 20px;
            }
            .detail-row {
              flex-direction: column;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚌 ຢືນຢັນການຈອງຕັ້ວ</h1>
            <div class="booking-id">ລະຫັດການຈອງ: ${bookingData.booking_id}</div>
          </div>
          
          <div class="content">
            <div class="greeting">
              ສະບາຍດີ <strong>${bookingData.contact_name}</strong>
            </div>
            <p>ຂໍຂອບໃຈທີ່ທ່ານໄດ້ຈອງຕັ້ວກັບເຮົາ. ການຈອງຂອງທ່ານໄດ້ຮັບການຢືນຢັນແລ້ວ ແລະ ການຊຳລະເງິນສຳເລັດແລ້ວ.</p>
            
            <div class="booking-details">
              <h3>📋 ລາຍລະອຽດການຈອງ</h3>
              <div class="detail-row">
                <span class="label">ວັນທີເດີນທາງ:</span>
                <span class="value">${new Date(bookingData.travel_date).toLocaleDateString('lo-LA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}</span>
              </div>
              <div class="detail-row">
                <span class="label">ຈຳນວນຜູ້ໂດຍສານ:</span>
                <span class="value">${bookingData.passenger_count} ຄົນ</span>
              </div>
              <div class="detail-row">
                <span class="label">ລາຄາລວມ:</span>
                <span class="value price">₭${bookingData.total_price.toLocaleString()}</span>
              </div>
              <div class="detail-row">
                <span class="label">ຜູ້ຕິດຕໍ່:</span>
                <span class="value">${bookingData.contact_name}</span>
              </div>
              <div class="detail-row">
                <span class="label">ເບີໂທ:</span>
                <span class="value">${bookingData.contact_phone}</span>
              </div>
              <div class="detail-row">
                <span class="label">ສະຖານະການຊຳລະ:</span>
                <span class="value" style="color: #059669;">✅ ຊຳລະແລ້ວ</span>
              </div>
            </div>

            <div class="qr-section">
              <h3>📱 QR Code ສຳລັບການເດີນທາງ</h3>
              <p><strong>ກະລຸນານຳ QR Code ນີ້ມາໃຫ້ພະນັກງານຂັບລົດສະແກນ</strong></p>
              <img src="data:image/png;base64,${qrCodeBase64}" alt="QR Code" class="qr-code">
              <p style="font-size: 12px; color: #666;">QR Code ນີ້ມີຂໍ້ມູນການຈອງຂອງທ່ານ</p>
            </div>

            <div class="important-note">
              <h4>⚠️ ຂໍ້ສຳຄັນທີ່ຕ້ອງຈື່:</h4>
              <ul>
                <li>ກະລຸນາມາຖືງສະຖານີລົດເມກ່ອນເວລາເດີນທາງ <strong>15 ນາທີ</strong></li>
                <li>ຕ້ອງເອົາ QR Code ນີ້ມາໃຫ້ພະນັກງານສະແກນ</li>
                <li>ສາມາດຍົກເລີກການຈອງໄດ້ພາຍໃນ <strong>24 ຊົ່ວໂມງ</strong> ຫຼັງຈອງ</li>
                <li>ຖ້າມີຄຳຖາມ ໃຫ້ຕິດຕໍ່ເບີ: <strong>020-1234-5678</strong></li>
                <li>ບໍ່ສາມາດໂອນການຈອງໃຫ້ຄົນອື່ນໄດ້</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #059669; font-weight: bold;">ຂໍໃຫ້ການເດີນທາງຂອງທ່ານເປັນໄປດ້ວຍດີ! 🚌✨</p>
            </div>
          </div>

          <div class="footer">
            <p><strong>ຂໍຂອບໃຈທີ່ເລືອກໃຊ້ບໍລິການຂອງເຮົາ</strong></p>
            <p>Bus Ticket System - Luang Prabang Railway Station</p>
            <p style="font-size: 12px; color: #999;">
              ອີເມວນີ້ຖືກສົ່ງໂດຍອັດຕະໂນມັດ ກະລຸນາຢ່າຕອບກັບ
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send QR Code email
  async sendQRCodeEmail(bookingData: IBooking, qrData: QRData): Promise<boolean> {
    try {
      console.log('📧 Preparing to send QR code email to:', bookingData.contact_email);

      // Generate QR Code
      const qrCodeBase64 = await this.generateQRCode(qrData);

      const mailOptions = {
        from: this.fromEmail,
        to: bookingData.contact_email,
        subject: `🎫 ຢືນຢັນການຈອງຕັ້ວ - ${bookingData.booking_id}`,
        html: this.createQREmailTemplate(bookingData, qrCodeBase64),
        attachments: [
          {
            filename: `qr-code-${bookingData.booking_id}.png`,
            content: qrCodeBase64,
            encoding: 'base64',
            cid: 'qr-code'
          }
        ]
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ QR Code email sent successfully:', {
        messageId: result.messageId,
        to: bookingData.contact_email,
        bookingId: bookingData.booking_id
      });

      return true;

    } catch (error) {
      console.error('❌ Failed to send QR code email:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bookingId: bookingData.booking_id,
        email: bookingData.contact_email
      });
      
      // Don't throw error, just return false to allow booking to continue
      return false;
    }
  }

  // Send cancellation email
  async sendCancellationEmail(bookingData: IBooking, reason?: string): Promise<boolean> {
    try {
      console.log('📧 Sending cancellation email to:', bookingData.contact_email);

      const mailOptions = {
        from: this.fromEmail,
        to: bookingData.contact_email,
        subject: `❌ ຍົກເລີກການຈອງ - ${bookingData.booking_id}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">ການຈອງຖືກຍົກເລີກ</h2>
            <p>ສະບາຍດີ ${bookingData.contact_name},</p>
            <p>ການຈອງຂອງທ່ານ <strong>${bookingData.booking_id}</strong> ຖືກຍົກເລີກແລ້ວ.</p>
            ${reason ? `<p><strong>ເຫດຜົນ:</strong> ${reason}</p>` : ''}
            <p>ຖ້າທ່ານໄດ້ຊຳລະເງິນແລ້ວ, ເງິນຈະຖືກຄືນພາຍໃນ 3-5 ວັນທຳການ.</p>
            <p>ຂໍຂອບໃຈ,<br>Bus Ticket System</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Cancellation email sent:', {
        messageId: result.messageId,
        bookingId: bookingData.booking_id
      });

      return true;

    } catch (error) {
      console.error('❌ Failed to send cancellation email:', error);
      return false;
    }
  }

  // Test email connection
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection test passed');
      return true;
    } catch (error) {
      console.error('❌ Email service connection test failed:', error);
      return false;
    }
  }
}

// Create and export singleton instance
export const emailService = new EmailService();

// Export types
export type { QRData };