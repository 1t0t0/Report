// app/api/bookings/route.ts - Main booking API
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

// สร้าง email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// POST - สร้างการจองใหม่
export async function POST(request: Request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { 
      customer_name, 
      customer_phone, 
      customer_email, 
      travel_date, 
      passenger_count, 
      destination, 
      payment_slip_url 
    } = body;
    
    console.log('📋 Booking request received:', {
      customer_name,
      customer_phone,
      customer_email,
      travel_date,
      passenger_count,
      destination
    });
    
    // Validate required fields
    if (!customer_name || !customer_phone || !customer_email || !travel_date || 
        !passenger_count || !destination || !payment_slip_url) {
      return NextResponse.json(
        { error: 'ກະລຸນາໃສ່ຂໍ້ມູນໃຫ້ຄົບຖ້ວນ' },
        { status: 400 }
      );
    }
    
    // Clean phone number
    const cleanPhone = customer_phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'ເບີໂທລະສັບຕ້ອງເປັນ 10 ຫຼັກ' },
        { status: 400 }
      );
    }
    
    // Validate passenger count
    const passengerCountNum = parseInt(passenger_count);
    if (passengerCountNum < 1 || passengerCountNum > 10) {
      return NextResponse.json(
        { error: 'ຈຳນວນຜູ້ໂດຍສານຕ້ອງຢູ່ລະຫວ່າງ 1-10 ຄົນ' },
        { status: 400 }
      );
    }
    
    // Validate travel date (must be within 5 days)
    const travelDateObj = new Date(travel_date);
    const today = new Date();
    const maxDate = new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000));
    
    if (travelDateObj < today || travelDateObj > maxDate) {
      return NextResponse.json(
        { error: 'ວັນທີ່ເດີນທາງຕ້ອງຢູ່ໃນໄລຍະ 5 ວັນຂ້າງໜ້າ' },
        { status: 400 }
      );
    }
    
    // Calculate total price
    const pricePerPerson = 45000; // LAK
    const totalPrice = pricePerPerson * passengerCountNum;
    
    try {
      // Generate unique booking ID
      const bookingId = await Booking.generateBookingId();
      
      // Create booking
      const booking = await Booking.create({
        booking_id: bookingId,
        customer_name: customer_name.trim(),
        customer_phone: cleanPhone,
        customer_email: customer_email.toLowerCase().trim(),
        travel_date: travelDateObj,
        passenger_count: passengerCountNum,
        destination: destination.trim(),
        total_price: totalPrice,
        payment_slip_url
      });
      
      console.log('✅ Booking created successfully:', bookingId);
      
      // Send confirmation email
      try {
        await sendBookingConfirmationEmail(booking);
        console.log('📧 Confirmation email sent to:', customer_email);
      } catch (emailError) {
        console.error('❌ Failed to send confirmation email:', emailError);
        // Continue anyway - booking is created
      }
      
      return NextResponse.json({
        success: true,
        booking_id: bookingId,
        total_price: totalPrice,
        can_cancel_until: booking.can_cancel_until,
        message: 'ການຈອງສຳເລັດແລ້ວ! ກະລຸນາລໍຖ້າການອະນຸມັດຈາກ Admin'
      });
      
    } catch (createError: any) {
      if (createError.code === 11000) {
        // Duplicate booking ID, try again
        return NextResponse.json(
          { error: 'ເກີດຂໍ້ຜິດພາດໃນການສ້າງເລກທີ່ການຈອງ ກະລຸນາລອງໃໝ່' },
          { status: 500 }
        );
      }
      throw createError;
    }
    
  } catch (error) {
    console.error('💥 Booking creation error:', error);
    return NextResponse.json(
      { 
        error: 'ເກີດຂໍ້ຜິດພາດໃນການສ້າງການຈອງ',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - ดึงการจองทั้งหมด (สำหรับ admin)
export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const phone = searchParams.get('phone');
    
    let filter: any = {};
    
    // Filter by payment status
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.payment_status = status;
    }
    
    // Filter by travel date
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000) - 1);
      filter.travel_date = { $gte: startOfDay, $lte: endOfDay };
    }
    
    // Filter by phone (for customer lookup)
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      filter.customer_phone = cleanPhone;
    }
    
    const bookings = await Booking.find(filter)
      .sort({ created_at: -1 })
      .limit(100);
    
    // Get statistics
    const stats = await Booking.getBookingStats();
    
    return NextResponse.json({
      success: true,
      bookings,
      stats
    });
    
  } catch (error) {
    console.error('Get Bookings Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// ฟังก์ชันส่งอีเมลยืนยันการจอง
async function sendBookingConfirmationEmail(booking: any) {
  const transporter = createEmailTransporter();
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@busticketsystem.com',
    to: booking.customer_email,
    subject: `ຢືນຢັນການຈອງ - ${booking.booking_id}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ຢືນຢັນການຈອງ</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .highlight { background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3; }
          .warning { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 ຢືນຢັນການຈອງ</h1>
            <p>ລະບົບອອກປີ້ລົດຕູ້ໂດຍສານປະຈຳທາງ</p>
          </div>
          
          <div class="content">
            <h2>ສະບາຍດີ ${booking.customer_name},</h2>
            <p>ການຈອງຂອງທ່ານໄດ້ຮັບແລ້ວ ແລະ ກຳລັງລໍຖ້າການອະນຸມັດຈາກ Admin</p>
            
            <div class="booking-details">
              <h3>📋 ລາຍລະອຽດການຈອງ</h3>
              <div class="detail-row">
                <span><strong>ເລກທີ່ການຈອງ:</strong></span>
                <span><strong>${booking.booking_id}</strong></span>
              </div>
              <div class="detail-row">
                <span>ຊື່ຜູ້ຈອງ:</span>
                <span>${booking.customer_name}</span>
              </div>
              <div class="detail-row">
                <span>ເບີໂທລະສັບ:</span>
                <span>${booking.formattedPhone}</span>
              </div>
              <div class="detail-row">
                <span>ວັນທີ່ເດີນທາງ:</span>
                <span>${booking.formattedTravelDate}</span>
              </div>
              <div class="detail-row">
                <span>ຈຳນວນຜູ້ໂດຍສານ:</span>
                <span>${booking.passenger_count} ຄົນ</span>
              </div>
              <div class="detail-row">
                <span>ປາຍທາງ:</span>
                <span>${booking.destination}</span>
              </div>
              <div class="detail-row">
                <span><strong>ລາຄາລວມ:</strong></span>
                <span><strong>₭${booking.total_price.toLocaleString()}</strong></span>
              </div>
            </div>
            
            <div class="highlight">
              <h3>✅ ຂັ້ນຕອນຕໍ່ໄປ</h3>
              <p>1. Admin ຈະກວດສອບຂໍ້ມູນແລະສະລິບການໂອນເງິນ</p>
              <p>2. ທ່ານຈະໄດ້ຮັບອີເມລແຈ້ງຜົນການອະນຸມັດ</p>
              <p>3. ເມື່ອອະນຸມັດແລ້ວ ທ່ານຈະໄດ້ຮັບ QR Code สำหรับໃຊ້ເດີນທາງ</p>
            </div>
            
            <div class="warning">
              <h3>⚠️ ຂໍ້ມູນສຳຄັນ</h3>
              <p><strong>ການຍົກເລີກ:</strong> ສາມາດຍົກເລີກໄດ້ພາຍໃນ 10 ຊົ່ວໂມງຫຼັງຈອງ</p>
              <p><strong>ກຳນົດເວລາຍົກເລີກ:</strong> ${new Date(booking.can_cancel_until).toLocaleString('lo-LA')}</p>
              <p><strong>ການຕິດຕໍ່:</strong> ຫາກມີຄຳຖາມ ກະລຸນາຕິດຕໍ່ Admin</p>
            </div>
            
            <div class="footer">
              <p>🚌 ລະບົບອອກປີ້ລົດຕູ້ໂດຍສານປະຈຳທາງ</p>
              <p>ລົດໄຟ ລາວ-ຈີນ</p>
              <p style="margin-top: 10px;">
                <em>ອີເມລນີ້ຖືກສົ່ງອັດຕະໂນມັດ ກະລຸນາຢ່າຕອບກັບ</em>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  await transporter.sendMail(mailOptions);
}