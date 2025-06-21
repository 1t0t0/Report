// app/api/bookings/send-status-link/route.ts - ส่งลิงก์เช็คสถานะ
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
              <p><strong>ວັນທີ່ເດີນທາງ:</strong> ${booking.formattedTravelDate}</p>
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

---

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

---

// app/api/bookings/[id]/route.ts - จัดการการจองแต่ละรายการ
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Ticket from '@/models/Ticket';
import jwt from 'jsonwebtoken';

// GET - ดึงข้อมูลการจองแต่ละรายการ
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const booking = await Booking.findById(params.id);
    
    if (!booking) {
      return NextResponse.json(
        { error: 'ບໍ່ພົບການຈອງ' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(booking);
    
  } catch (error) {
    console.error('Get Booking Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PUT - อัพเดทสถานะการจอง (สำหรับ admin)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { action, notes } = body;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
    
    const booking = await Booking.findById(params.id);
    
    if (!booking) {
      return NextResponse.json(
        { error: 'ບໍ່ພົບການຈອງ' },
        { status: 404 }
      );
    }
    
    if (booking.payment_status !== 'pending') {
      return NextResponse.json(
        { error: 'ການຊອງນີ້ຖືກດຳເນີນການແລ້ວ' },
        { status: 400 }
      );
    }
    
    if (action === 'approve') {
      // อนุมัติการจอง และสร้าง ticket
      booking.payment_status = 'approved';
      
      // สร้าง ticket ใหม่
      const ticket = await Ticket.create({
        price: booking.total_price,
        paymentMethod: 'qr', // ถือว่าจ่ายผ่าน QR/โอนเงิน
        soldBy: 'Booking System',
        soldAt: new Date(),
        ticketType: booking.passenger_count > 1 ? 'group' : 'individual',
        passengerCount: booking.passenger_count,
        pricePerPerson: booking.total_price / booking.passenger_count
      });
      
      booking.generated_ticket_id = ticket._id;
      console.log('✅ Ticket created for booking:', booking.booking_id, 'Ticket:', ticket.ticketNumber);
      
    } else if (action === 'reject') {
      // ปฏิเสธการจอง
      booking.payment_status = 'rejected';
    }
    
    if (notes) {
      booking.notes = notes;
    }
    
    await booking.save();
    
    // TODO: ส่งอีเมลแจ้งผลการอนุมัติ/ปฏิเสธ
    
    return NextResponse.json({
      success: true,
      booking,
      message: action === 'approve' ? 'ອະນຸມັດການຈອງສຳເລັດ' : 'ປະຕິເສດການຈອງແລ້ວ'
    });
    
  } catch (error) {
    console.error('Update Booking Error:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// DELETE - ยกเลิกการจอง (ด้วย JWT token)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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
      
      const booking = await Booking.findById(params.id);
      
      if (!booking) {
        return NextResponse.json(
          { error: 'ບໍ່ພົບການຈອງ' },
          { status: 404 }
        );
      }
      
      // Verify ownership
      if (booking.customer_phone !== decoded.phone || booking._id.toString() !== decoded.bookingId) {
        return NextResponse.json(
          { error: 'ບໍ່ມີສິດຍົກເລີກການຈອງນີ້' },
          { status: 403 }
        );
      }
      
      // Check if can still be cancelled
      if (!booking.canBeCancelled()) {
        return NextResponse.json(
          { error: 'ໝົດເວລາຍົກເລີກການຈອງແລ້ວ (10 ຊົ່ວໂມງ)' },
          { status: 400 }
        );
      }
      
      // Cancel booking
      booking.booking_status = 'cancelled';
      await booking.save();
      
      return NextResponse.json({
        success: true,
        message: 'ຍົກເລີກການຈອງສຳເລັດແລ້ວ'
      });
      
    } catch (jwtError) {
      return NextResponse.json(
        { error: 'ລິ້ງໝົດອາຍຸ ຫຼື ບໍ່ຖືກຕ້ອງ' },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Cancel Booking Error:', error);
    return NextResponse.json(
      { error: 'ເກີດຂໍ້ຜິດພາດໃນການຍົກເລີກ' },
      { status: 500 }
    );
  }
}

---

// app/api/admin/bookings/route.ts - API สำหรับ Admin จัดการการจอง
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET - ดึงการจองทั้งหมดสำหรับ Admin
export async function GET(request: Request) {
  try {
    // ตรวจสอบสิทธิ์ Admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Only admins can access bookings' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '50');
    
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
    
    // ดึงการจองพร้อม populate ticket ที่สร้างแล้ว
    const bookings = await Booking.find(filter)
      .populate('generated_ticket_id', 'ticketNumber')
      .sort({ created_at: -1 })
      .limit(limit);
    
    // ดึงสถิติ
    const stats = await Booking.getBookingStats();
    
    return NextResponse.json({
      success: true,
      bookings,
      stats
    });
    
  } catch (error) {
    console.error('Admin Get Bookings Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}