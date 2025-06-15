// app/api/booking/payment/route.ts - Payment Link Creation
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { lailaoPayment } from '@/lib/lailaoPayment';

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const { booking_id } = await request.json();
    
    if (!booking_id) {
      return NextResponse.json(
        { error: 'ລະຫັດການຈອງບໍ່ຖືກຕ້ອງ (Booking ID is required)' },
        { status: 400 }
      );
    }
    
    // ✅ ค้นหา booking
    const booking = await Booking.findOne({ 
      booking_id,
      booking_status: 'active',
      payment_status: 'pending'
    });
    
    if (!booking) {
      return NextResponse.json(
        { 
          error: 'ບໍ່ພົບການຈອງ ຫຼື ຖືກດຳເນີນການແລ້ວ (Booking not found or already processed)' 
        },
        { status: 404 }
      );
    }
    
    // ✅ ตรวจสอบว่าหมดอายุหรือยัง
    const now = new Date();
    if (booking.expires_at && booking.expires_at < now) {
      await Booking.findByIdAndUpdate(booking._id, {
        $set: { booking_status: 'expired' }
      });
      
      return NextResponse.json(
        { error: 'ການຈອງໝົດອາຍຸແລ້ວ (Booking has expired)' },
        { status: 400 }
      );
    }
    
    // ✅ สร้าง Payment Link ผ่าน Lailao
    try {
      const paymentResult = await lailaoPayment.createPaymentLink({
        booking_id: booking.booking_id,
        total_price: booking.total_price,
        passenger_count: booking.passenger_count,
        contact_email: booking.contact_email
      });
      
      // ✅ อัพเดท booking ด้วย payment link info
      const linkCode = paymentResult.redirectURL.split('linkCode=')[1] || '';
      
      await Booking.findByIdAndUpdate(booking._id, {
        $set: {
          payment_link_id: linkCode,
          payment_status: 'pending'
        }
      });
      
      console.log('✅ Payment link created for booking:', {
        booking_id: booking.booking_id,
        payment_url: paymentResult.redirectURL,
        link_code: linkCode
      });
      
      return NextResponse.json({
        success: true,
        payment_url: paymentResult.redirectURL,
        booking_id: booking.booking_id,
        amount: booking.total_price,
        expires_at: booking.expires_at
      });
      
    } catch (lailaoError) {
      console.error('❌ Lailao payment error:', lailaoError);
      
      return NextResponse.json(
        { 
          error: 'ບໍ່ສາມາດສ້າງລິ້ງການຊຳລະໄດ້ (Failed to create payment link)',
          details: lailaoError instanceof Error ? lailaoError.message : 'Payment gateway error'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Payment creation error:', error);
    return NextResponse.json(
      { 
        error: 'ເກີດຂໍ້ຜິດພາດໃນການສ້າງການຊຳລະ (Payment creation failed)',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - ตรวจสอบสถานะการชำระเงิน
export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const booking_id = searchParams.get('booking_id');
    
    if (!booking_id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }
    
    const booking = await Booking.findOne({ booking_id })
      .populate('ticket_id', 'ticketNumber');
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      booking: {
        booking_id: booking.booking_id,
        payment_status: booking.payment_status,
        booking_status: booking.booking_status,
        qr_code_sent: booking.qr_code_sent,
        ticket_id: booking.ticket_id,
        created_at: booking.created_at,
        expires_at: booking.expires_at
      }
    });
    
  } catch (error) {
    console.error('❌ Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}