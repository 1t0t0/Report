// app/api/bookings/status/route.ts - เช็คสถานะการจอง
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import jwt from 'jsonwebtoken';

// GET - เช็คสถานะการจองด้วย JWT token
export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as any;
      
      if (decoded.type !== 'booking_status') {
        return NextResponse.json(
          { error: 'Invalid token type' },
          { status: 401 }
        );
      }
      
      // Find booking
      const booking = await Booking.findById(decoded.bookingId);
      
      if (!booking) {
        return NextResponse.json(
          { error: 'ບໍ່ພົບການຈອງ' },
          { status: 404 }
        );
      }
      
      // Verify phone number matches
      if (booking.customer_phone !== decoded.phone) {
        return NextResponse.json(
          { error: 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ' },
          { status: 401 }
        );
      }
      
      return NextResponse.json({
        success: true,
        booking: {
          booking_id: booking.booking_id,
          customer_name: booking.customer_name,
          travel_date: booking.travel_date,
          passenger_count: booking.passenger_count,
          destination: booking.destination,
          total_price: booking.total_price,
          payment_status: booking.payment_status,
          booking_status: booking.booking_status,
          can_cancel: booking.canCancel,
          can_cancel_until: booking.can_cancel_until,
          created_at: booking.created_at,
          notes: booking.notes
        }
      });
      
    } catch (jwtError) {
      return NextResponse.json(
        { error: 'ລິ້ງໝົດອາຍຸ ຫຼື ບໍ່ຖືກຕ້ອງ' },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Booking Status Check Error:', error);
    return NextResponse.json(
      { error: 'ເກີດຂໍ້ຜິດພາດໃນລະບົບ' },
      { status: 500 }
    );
  }
}