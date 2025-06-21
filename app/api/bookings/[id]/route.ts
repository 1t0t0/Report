// app/api/bookings/[id]/route.ts - FIXED VERSION - แก้ไข Next.js 15 async params และ Ticket creation
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Ticket from '@/models/Ticket';
import jwt from 'jsonwebtoken';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET - ดึงข้อมูลการจองแต่ละรายการ
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }  // ✅ Next.js 15: params เป็น Promise
) {
  try {
    await connectDB();
    
    // ✅ Await params ก่อนใช้งาน
    const { id } = await params;
    console.log('📖 Getting booking with ID:', id);
    
    const booking = await Booking.findById(id);
    
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

// PUT - อัพเดทสถานะการจอง (สำหรับ admin) - ✅ แก้ไขแล้ว
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }  // ✅ Next.js 15: params เป็น Promise
) {
  try {
    console.log('🔄 Starting booking update process...');
    
    // ✅ ตรวจสอบสิทธิ์ Admin/Staff
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'staff'].includes(session.user.role)) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized - Admin/Staff only' },
        { status: 401 }
      );
    }
    
    await connectDB();
    
    // ✅ Await params ก่อนใช้งาน
    const { id } = await params;
    console.log('📝 Updating booking with ID:', id);
    
    const body = await request.json();
    const { action, notes } = body;
    
    console.log('📋 Update request:', { action, notes, adminUser: session.user.email });
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
    
    const booking = await Booking.findById(id);
    
    if (!booking) {
      console.log('❌ Booking not found:', id);
      return NextResponse.json(
        { error: 'ບໍ່ພົບການຈອງ' },
        { status: 404 }
      );
    }
    
    console.log('📊 Current booking status:', {
      bookingId: booking.booking_id,
      currentStatus: booking.payment_status,
      customerName: booking.customer_name
    });
    
    if (booking.payment_status !== 'pending') {
      console.log('❌ Booking already processed:', booking.payment_status);
      return NextResponse.json(
        { error: 'ການຈອງນີ້ຖືກດຳເນີນການແລ້ວ' },
        { status: 400 }
      );
    }
    
    if (action === 'approve') {
      console.log('✅ Approving booking and creating ticket...');
      
      // อนุมัติการจอง
      booking.payment_status = 'approved';
      
      try {
        // ✅ สร้าง ticket ใหม่ - แก้ไขให้ส่ง ticketNumber
        const ticketData = {
          price: booking.total_price,
          paymentMethod: 'qr', // ถือว่าจ่ายผ่าน QR/โอนเงิน
          soldBy: session.user.email || session.user.name || 'Booking System',
          soldAt: new Date(),
          ticketType: booking.passenger_count > 1 ? 'group' : 'individual',
          passengerCount: booking.passenger_count,
          pricePerPerson: booking.total_price / booking.passenger_count
          // ✅ ไม่ต้องส่ง ticketNumber เพราะ Ticket model จะ generate เอง
        };
        
        console.log('🎫 Creating ticket with data:', ticketData);
        
        const ticket = await Ticket.create(ticketData);
        
        console.log('✅ Ticket created successfully:', {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          price: ticket.price,
          passengerCount: ticket.passengerCount
        });
        
        // เชื่อมโยง ticket กับ booking
        booking.generated_ticket_id = ticket._id;
        
      } catch (ticketError) {
        console.error('❌ Failed to create ticket:', ticketError);
        return NextResponse.json(
          { error: 'ເກີດຂໍ້ຜິດພາດໃນການສ້າງຕັ້ວ: ' + (ticketError as Error).message },
          { status: 500 }
        );
      }
      
    } else if (action === 'reject') {
      console.log('❌ Rejecting booking...');
      // ปฏิเสธการจอง
      booking.payment_status = 'rejected';
    }
    
    // เพิ่มหมายเหตุถ้ามี
    if (notes) {
      booking.notes = notes;
      console.log('📝 Added notes:', notes);
    }
    
    // บันทึกการเปลี่ยนแปลง
    await booking.save();
    
    console.log('💾 Booking updated successfully:', {
      bookingId: booking.booking_id,
      newStatus: booking.payment_status,
      hasTicket: !!booking.generated_ticket_id
    });
    
    // TODO: ส่งอีเมลแจ้งผลการอนุมัติ/ปฏิเสธ
    try {
      console.log('📧 Sending notification email...');
      // สามารถเพิ่มการส่งอีเมลแจ้งผลได้ที่นี่
    } catch (emailError) {
      console.warn('⚠️ Failed to send notification email:', emailError);
      // ไม่ให้ error นี้ทำให้การอัพเดทล้มเหลว
    }
    
    return NextResponse.json({
      success: true,
      booking: {
        _id: booking._id,
        booking_id: booking.booking_id,
        customer_name: booking.customer_name,
        payment_status: booking.payment_status,
        notes: booking.notes,
        generated_ticket_id: booking.generated_ticket_id
      },
      message: action === 'approve' ? 'ອະນຸມັດການຈອງສຳເລັດ' : 'ປະຕິເສດການຈອງແລ້ວ'
    });
    
  } catch (error) {
    console.error('💥 Update Booking Error:', error);
    
    // ✅ แสดง error ที่ละเอียดขึ้น
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error && (error as any).errors ? (error as any).errors : null;
    
    console.error('Error details:', {
      message: errorMessage,
      details: errorDetails,
      stack: error instanceof Error ? error.stack : null
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to update booking',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - ยกเลิกการจอง (ด้วย JWT token) - ✅ แก้ไข async params
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }  // ✅ Next.js 15: params เป็น Promise
) {
  try {
    await connectDB();
    
    // ✅ Await params ก่อนใช้งาน
    const { id } = await params;
    console.log('🗑️ Cancelling booking with ID:', id);
    
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
      
      const booking = await Booking.findById(id);
      
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
      
      console.log('✅ Booking cancelled successfully:', booking.booking_id);
      
      return NextResponse.json({
        success: true,
        message: 'ຍົກເລີກການຈອງສຳເລັດແລ້ວ'
      });
      
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
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