// app/api/bookings/send-status-link/route.ts - ส่งลิงก์เช็คสถานะ
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

// สร้าง email transporter
const createEmailTransporter = () => {
  // ถ้าไม่มี SMTP config ให้ return null
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 SMTP not configured, email will be skipped');
    return null;
  }
  
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

// POST - ส่งลิงก์เช็คสถานะการจอง
export async function POST(request: Request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { phone } = body;
    
    if (!phone) {
      return NextResponse.json(
        { error: 'ກະລຸນາໃສ່ເບີໂທລະສັບ' },
        { status: 400 }
      );
    }
    
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'ເບີໂທລະສັບຕ້ອງເປັນ 10 ຫຼັກ' },
        { status: 400 }
      );
    }
    
    // Find active bookings for this phone number
    const bookings = await Booking.findByPhone(cleanPhone);
    
    if (bookings.length === 0) {
      return NextResponse.json(
        { error: 'ບໍ່ພົບການຈອງສຳລັບເບີໂທລະສັບນີ້' },
        { status: 404 }
      );
    }
    
    // Get the latest booking
    const latestBooking = bookings[0];
    
    // Create JWT token for secure access
    const token = jwt.sign(
      { 
        phone: cleanPhone, 
        bookingId: latestBooking._id.toString(),
        type: 'booking_status'
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    // Send email with status link
    try {
      await sendStatusLinkEmail(latestBooking, token);
      
      return NextResponse.json({
        success: true,
        message: 'ລິ້ງເຊັກສະຖານະໄດ້ຖືກສົ່ງໄປທີ່ອີເມລແລ້ວ',
        email: latestBooking.customer_email
      });
      
    } catch (emailError) {
      console.error('Failed to send status link email:', emailError);
      return NextResponse.json(
        { error: 'ເກີດຂໍ້ຜິດພາດໃນການສົ່ງອີເມລ' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Send Status Link Error:', error);
    return NextResponse.json(
      { error: 'ເກີດຂໍ້ຜິດພາດໃນລະບົບ' },
      { status: 500 }
    );
  }
}

// ฟังก์ชันส่งอีเมลพร้อมลิงก์เช็คสถานะ
async function sendStatusLinkEmail(booking: any, token: string) {
  const transporter = createEmailTransporter();
  
  if (!transporter) {
    throw new Error('Email transporter not configured');
  }
  
  const statusUrl = `${process.env.NEXTAUTH_URL}/booking/status?token=${token}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@busticketsystem.com',
    to: booking.customer_email,
    subject: `ເຊັກສະຖານະການຈອງ - ${booking.booking_id}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ເຊັກສະຖານະການຈອງ</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .booking-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .cta-button { 
            display: inline-block; 
            background: #10B981; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: bold; 
            margin: 20px 0; 
          }
          .warning { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔍 ເຊັກສະຖານະການຈອງ</h1>
            <p>ລະບົບອອກປີ້ລົດຕູ້ໂດຍສານປະຈຳທາງ</p>
          </div>
          
          <div class="content">
            <h2>ສະບາຍດີ ${booking.customer_name},</h2>
            <p>ທ່ານສາມາດເຊັກສະຖານະການຈອງໄດ້ໂດຍການຄລິກປຸ່ມຂ້າງລຸ່ມນີ້:</p>
            
            <div style="text-align: center;">
              <a href="${statusUrl}" class="cta-button">
                📱 ເຊັກສະຖານະການຈອງ
              </a>
            </div>
            
            <div class="booking-info">
              <h3>📋 ຂໍ້ມູນການຈອງ</h3>
              <p><strong>ເລກທີ່ການຈອງ:</strong> ${booking.booking_id}</p>
              <p><strong>ວັນທີ່ເດີນທາງ:</strong> ${new Date(booking.travel_date).toLocaleDateString('lo-LA')}</p>
              <p><strong>ຈຳນວນຜູ້ໂດຍສານ:</strong> ${booking.passenger_count} ຄົນ</p>
              <p><strong>ປາຍທາງ:</strong> ${booking.destination}</p>
            </div>
            
            <div class="warning">
              <h3>⚠️ ຂໍ້ມູນສຳຄັນ</h3>
              <p><strong>ລິ້ງນີ້ຈະໝົດອາຍຸໃນ:</strong> 24 ຊົ່ວໂມງ</p>
              <p><strong>ຄວາມປອດໄພ:</strong> ຢ່າແບ່ງປັນລິ້ງນີ້ໃຫ້ຄົນອື່ນ</p>
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