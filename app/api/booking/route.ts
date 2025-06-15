// app/api/booking/route.ts - Main Booking API (Next.js 15 Compatible)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';

// POST - สร้างการจองใหม่
export async function POST(request: Request) {
  try {
    // No session required for public booking
    await connectDB();
    
    const body = await request.json();
    const { 
      travel_date, 
      passenger_count, 
      contact_name, 
      contact_phone, 
      contact_email 
    } = body;
    
    console.log('📝 New booking request:', { travel_date, passenger_count, contact_name });
    
    // ✅ Validation
    if (!travel_date || !passenger_count || !contact_name || !contact_phone || !contact_email) {
      return NextResponse.json(
        { error: 'ກະລຸນາໃສ່ຂໍ້ມູນໃຫ້ຄົບຖ້ວນ (All fields are required)' },
        { status: 400 }
      );
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return NextResponse.json(
        { error: 'ຮູບແບບອີເມວບໍ່ຖືກຕ້ອງ (Invalid email format)' },
        { status: 400 }
      );
    }
    
    // Phone validation (Lao format)
    const phoneRegex = /^[0-9]{8,10}$/;
    if (!phoneRegex.test(contact_phone.replace(/[\s-]/g, ''))) {
      return NextResponse.json(
        { error: 'ເບີໂທບໍ່ຖືກຕ້ອງ (Invalid phone number)' },
        { status: 400 }
      );
    }
    
    // ✅ Travel date validation
    const travelDate = new Date(travel_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 10); // 10 days from today
    
    if (travelDate < today) {
      return NextResponse.json(
        { error: 'ບໍ່ສາມາດຈອງວັນທີ່ຜ່ານມາແລ້ວ (Cannot book past dates)' },
        { status: 400 }
      );
    }
    
    if (travelDate > maxDate) {
      return NextResponse.json(
        { error: 'ສາມາດຈອງໄດ້ສູງສຸດ 10 ວັນຂ້າງໜ້າ (Can book maximum 10 days in advance)' },
        { status: 400 }
      );
    }
    
    // ✅ Passenger count validation
    const passengerNum = parseInt(passenger_count);
    if (isNaN(passengerNum) || passengerNum < 1 || passengerNum > 10) {
      return NextResponse.json(
        { error: 'ຈຳນວນຜູ້ໂດຍສານຕ້ອງຢູ່ລະຫວ່າງ 1-10 ຄົນ (Passenger count must be 1-10)' },
        { status: 400 }
      );
    }
    
    // ✅ Check daily booking limit (100 passengers max per day)
    const existingBookings = await Booking.aggregate([
      {
        $match: {
          travel_date: travel_date,
          booking_status: { $in: ['active', 'used'] },
          payment_status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalPassengers: { $sum: '$passenger_count' }
        }
      }
    ]);
    
    const currentPassengerCount = existingBookings[0]?.totalPassengers || 0;
    const availableSeats = 100 - currentPassengerCount; // Assume 100 seats per day
    
    if (passengerNum > availableSeats) {
      return NextResponse.json(
        { 
          error: `ທີ່ນັ່ງບໍ່ພຽງພໍ ເຫຼືອພຽງ ${availableSeats} ທີ່ນັ່ງ (Not enough seats available. Only ${availableSeats} seats left)` 
        },
        { status: 400 }
      );
    }
    
    // ✅ Generate booking ID
    const booking_id = await Booking.generateBookingId();
    
    // ✅ Calculate total price (45,000 LAK per person)
    const total_price = passengerNum * 45000;
    
    // ✅ Create booking
    const booking = await Booking.create({
      booking_id,
      travel_date,
      passenger_count: passengerNum,
      total_price,
      contact_name: contact_name.trim(),
      contact_phone: contact_phone.replace(/[\s-]/g, ''),
      contact_email: contact_email.toLowerCase().trim(),
      expires_at: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours
    });
    
    console.log('✅ Booking created successfully:', {
      booking_id: booking.booking_id,
      travel_date: booking.travel_date,
      passenger_count: booking.passenger_count,
      total_price: booking.total_price
    });
    
    return NextResponse.json({
      success: true,
      booking: {
        booking_id: booking.booking_id,
        travel_date: booking.travel_date,
        passenger_count: booking.passenger_count,
        total_price: booking.total_price,
        contact_name: booking.contact_name,
        contact_email: booking.contact_email,
        payment_status: booking.payment_status,
        booking_status: booking.booking_status,
        expires_at: booking.expires_at
      }
    });
    
  } catch (error) {
    console.error('❌ Booking creation error:', error);
    
    // Handle duplicate booking ID (very rare)
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'ເກີດຂໍ້ຜິດພາດໃນລະບົບ ກະລຸນາລອງໃໝ່ (System error, please try again)' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'ເກີດຂໍ້ຜິດພາດໃນການສ້າງການຈອງ (Failed to create booking)',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - ดึงรายการจองสำหรับ Admin
export async function GET(request: Request) {
  try {
    // ✅ Next.js 15 - await session
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'staff'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Only admin and staff can view bookings' },
        { status: 401 }
      );
    }
    
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const email = searchParams.get('email');
    
    // Build filter
    const filter: any = {};
    if (status) filter.booking_status = status;
    if (date) filter.travel_date = date;
    if (email) filter.contact_email = { $regex: email, $options: 'i' };
    
    const skip = (page - 1) * limit;
    
    // Get bookings with pagination
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('ticket_id', 'ticketNumber price'),
      Booking.countDocuments(filter)
    ]);
    
    // Get summary statistics
    const stats = await Booking.getBookingStats();
    
    console.log('📊 Bookings retrieved:', {
      total,
      page,
      limit,
      filter
    });
    
    return NextResponse.json({
      success: true,
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats
    });
    
  } catch (error) {
    console.error('❌ Get bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}