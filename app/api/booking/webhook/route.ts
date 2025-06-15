// app/api/booking/webhook/route.ts - Lailao Webhook Handler (Next.js 15)
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Ticket from '@/models/Ticket';
import { lailaoPayment } from '@/lib/lailaoPayment';
import { emailService } from '@/lib/emailService';

// Helper function to generate unique ticket number
async function generateUniqueTicketNumber(): Promise<string> {
  const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const maxAttempts = 20;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let result = 'T';
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * SAFE_CHARS.length);
      result += SAFE_CHARS[randomIndex];
    }
    
    const existingTicket = await Ticket.findOne({ ticketNumber: result });
    if (!existingTicket) {
      return result;
    }
  }
  
  // Emergency fallback
  const timestamp = Date.now().toString().slice(-3);
  const emergency = `T${SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]}${timestamp}`;
  console.log(`🆘 Using emergency ticket number: ${emergency}`);
  return emergency;
}

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const webhookData = await request.json();
    
    console.log('🔔 Lailao Webhook received:', {
      transactionId: webhookData.transactionId,
      status: webhookData.status,
      tag1: webhookData.tag1, // booking_id
      amount: webhookData.txnAmount
    });
    
    // ✅ Parse webhook data safely
    const parsedData = lailaoPayment.parseWebhookData(webhookData);
    if (!parsedData) {
      console.error('❌ Invalid webhook data structure');
      return NextResponse.json(
        { error: 'Invalid webhook data' },
        { status: 400 }
      );
    }
    
    // ✅ Verify webhook signature
    if (!lailaoPayment.verifyWebhookSignature(parsedData)) {
      console.error('❌ Webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }
    
    const { tag1: booking_id, status, txnAmount, transactionId } = parsedData;
    
    if (!booking_id) {
      console.error('❌ No booking_id in webhook data');
      return NextResponse.json(
        { error: 'Missing booking ID in webhook' },
        { status: 400 }
      );
    }
    
    // ✅ ค้นหา booking
    const booking = await Booking.findOne({ booking_id });
    if (!booking) {
      console.error('❌ Booking not found for webhook:', booking_id);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // ✅ ป้องกัน duplicate webhook processing
    if (booking.payment_status === 'paid' && booking.transaction_id === transactionId) {
      console.log('⚠️ Duplicate webhook for already processed booking:', booking_id);
      return NextResponse.json({ 
        success: true, 
        message: 'Already processed' 
      });
    }
    
    // ✅ ตรวจสอบสถานะการชำระเงิน
    if (lailaoPayment.isPaymentSuccessful(status)) {
      console.log('✅ Payment successful for booking:', booking_id);
      
      try {
        // ✅ สร้าง Ticket
        const ticketNumber = await generateUniqueTicketNumber();
        const ticket = await Ticket.create({
          ticketNumber,
          price: booking.total_price,
          soldBy: 'Online Booking',
          paymentMethod: 'qr',
          soldAt: new Date(),
          ticketType: 'group',
          passengerCount: booking.passenger_count,
          pricePerPerson: 45000
        });
        
        console.log('🎫 Ticket created:', {
          ticketNumber: ticket.ticketNumber,
          price: ticket.price,
          passengerCount: ticket.passengerCount
        });
        
        // ✅ อัพเดท booking เป็น paid
        await Booking.findByIdAndUpdate(booking._id, {
          $set: {
            payment_status: 'paid',
            ticket_id: ticket._id,
            transaction_id: transactionId,
            payment_response: parsedData
          }
        });
        
        // ✅ ส่ง QR Code ทาง Email
        const qrData = {
          ticketNumber: ticket.ticketNumber,
          ticketType: 'group' as const,
          passengerCount: booking.passenger_count
        };
        
        const emailSent = await emailService.sendQRCodeEmail(booking, qrData);
        
        if (emailSent) {
          // อัพเดทสถานะส่ง Email
          await Booking.findByIdAndUpdate(booking._id, {
            $set: { qr_code_sent: true }
          });
          
          console.log('📧 QR Code email sent successfully to:', booking.contact_email);
        } else {
          console.error('❌ Failed to send QR code email, but booking is still valid');
        }
        
        console.log('🎉 Booking completed successfully:', {
          booking_id: booking.booking_id,
          ticket_number: ticket.ticketNumber,
          email_sent: emailSent,
          transaction_id: transactionId
        });
        
      } catch (ticketError) {
        console.error('❌ Error creating ticket or sending email:', ticketError);
        
        // อัพเดท booking เป็น paid แต่มีปัญหาในการสร้าง ticket
        await Booking.findByIdAndUpdate(booking._id, {
          $set: {
            payment_status: 'paid',
            transaction_id: transactionId,
            payment_response: parsedData,
            // Add error flag for manual review
            processing_error: ticketError instanceof Error ? ticketError.message : 'Unknown error'
          }
        });
        
        console.log('⚠️ Payment successful but ticket creation failed. Manual review required.');
      }
      
    } else if (lailaoPayment.isPaymentFailed(status)) {
      // ✅ ชำระเงินล้มเหลว
      console.log('❌ Payment failed for booking:', booking_id);
      
      await Booking.findByIdAndUpdate(booking._id, {
        $set: {
          payment_status: 'failed',
          transaction_id: transactionId,
          payment_response: parsedData
        }
      });
      
    } else {
      // ✅ สถานะอื่นๆ (pending, processing, etc.)
      console.log('ℹ️ Payment status update for booking:', booking_id, 'Status:', status);
      
      await Booking.findByIdAndUpdate(booking._id, {
        $set: {
          transaction_id: transactionId,
          payment_response: parsedData
        }
      });
    }
    
    // ✅ ส่งตอบกลับให้ Lailao
    return NextResponse.json({ 
      success: true,
      booking_id: booking_id,
      processed_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Webhook processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    // ส่งกลับ error แต่ไม่ให้ Lailao retry หากเป็น client error
    const statusCode = error instanceof Error && 
      (error.message.includes('not found') || error.message.includes('Invalid')) 
      ? 400 : 500;
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

// GET - สำหรับ webhook verification (ถ้า Lailao ต้องการ)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('challenge');
    
    if (challenge) {
      // Webhook verification challenge
      return NextResponse.json({ challenge });
    }
    
    return NextResponse.json({ 
      status: 'Webhook endpoint active',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 500 }
    );
  }
}