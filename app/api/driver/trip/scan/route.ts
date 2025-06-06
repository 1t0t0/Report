// app/api/driver/trip/scan/route.ts - แก้ไขให้ตรวจสอบ ticket ทั้งระบบ
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverTrip from '@/models/DriverTrip';
import Ticket from '@/models/Ticket';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// POST - สแกน QR Code หรือเลขตั๋ว (ตรวจสอบ duplicate ทั้งระบบ)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'driver') {
      return NextResponse.json(
        { error: 'Unauthorized - Only drivers can access this endpoint' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const body = await request.json();
    const { ticketId, qrData } = body;
    
    console.log('Scan request:', { ticketId, qrData });
    
    let ticketNumber = ticketId;
    
    // ตรวจสอบข้อมูล QR Code (ถ้ามี)
    if (qrData) {
      try {
        const parsedQRData = JSON.parse(qrData);
        if (parsedQRData.forDriverOnly && parsedQRData.ticketNumber) {
          ticketNumber = parsedQRData.ticketNumber;
          console.log('Using ticket number from QR:', ticketNumber);
        }
      } catch (error) {
        console.warn('Failed to parse QR data, using ticketId as fallback');
      }
    }
    
    if (!ticketNumber || !ticketNumber.trim()) {
      return NextResponse.json(
        { error: 'ກະລຸນາໃສ່ເລກທີ່ຕັ້ວ' },
        { status: 400 }
      );
    }
    
    const driverId = session.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    // ตรวจสอบว่ามีรอบที่กำลังดำเนินการอยู่หรือไม่
    const activeTrip = await DriverTrip.findOne({
      driver_id: driverId,
      date: today,
      status: 'in_progress'
    });
    
    if (!activeTrip) {
      return NextResponse.json(
        { error: 'ກະລຸນາເລີ່ມການເດີນທາງກ່ອນ' },
        { status: 400 }
      );
    }
    
    console.log('Active trip found:', activeTrip._id);
    
    // ค้นหา ticket โดยใช้ ticketNumber
    const ticket = await Ticket.findOne({ ticketNumber: ticketNumber.trim() });
    if (!ticket) {
      return NextResponse.json(
        { error: `ບໍ່ພົບຂໍ້ມູນຕັ້ວເລກທີ ${ticketNumber}` },
        { status: 404 }
      );
    }
    
    console.log('Ticket found:', ticket._id, ticket.ticketNumber);
    
    // ✅ ตรวจสอบใหม่: ว่า ticket นี้ถูกสแกนไปแล้วในระบบหรือไม่
    const ticketUsedInSystem = await DriverTrip.findOne({
      'scanned_tickets.ticket_id': ticket._id
    });
    
    if (ticketUsedInSystem) {
      // หาข้อมูลการสแกนและ driver ที่สแกน
      const usedByTrip = await DriverTrip.findOne({
        'scanned_tickets.ticket_id': ticket._id
      }).populate('driver_id', 'name employeeId');
      
      const scanDetails = usedByTrip?.scanned_tickets.find(
        (scan: any) => scan.ticket_id.toString() === ticket._id.toString()
      );
      
      const usedByDriverName = usedByTrip?.driver_id?.name || 'Unknown';
      const usedByEmployeeId = usedByTrip?.driver_id?.employeeId || 'Unknown';
      const scannedAt = scanDetails?.scanned_at ? new Date(scanDetails.scanned_at).toLocaleString('lo-LA') : 'Unknown';
      
      return NextResponse.json(
        { 
          error: `❌ ຕັ້ວເລກທີ ${ticketNumber} ຖືກສະແກນໄປແລ້ວ`,
          details: {
            message: `ຖືກສະແກນໂດຍ: ${usedByDriverName} (${usedByEmployeeId})`,
            scannedAt: `ເວລາ: ${scannedAt}`,
            tripId: usedByTrip?._id,
            usedByDriver: {
              name: usedByDriverName,
              employeeId: usedByEmployeeId
            }
          }
        },
        { status: 400 }
      );
    }
    
    // ✅ ตรวจสอบว่าเกินความจุหรือไม่
    if (activeTrip.current_passengers >= activeTrip.car_capacity) {
      return NextResponse.json(
        { error: `ລົດເຕັມແລ້ວ! ຄວາມຈຸສູງສຸດ ${activeTrip.car_capacity} ຄົນ` },
        { status: 400 }
      );
    }
    
    // เพิ่มผู้โดยสาร
    const passengerOrder = activeTrip.current_passengers + 1;
    
    activeTrip.scanned_tickets.push({
      ticket_id: ticket._id,
      scanned_at: new Date(),
      passenger_order: passengerOrder
    });
    
    activeTrip.current_passengers = passengerOrder;
    
    // ✅ อัพเดท: ตรวจสอบและอัพเดท is_80_percent_reached
    const is80PercentReached = activeTrip.current_passengers >= activeTrip.required_passengers;
    activeTrip.is_80_percent_reached = is80PercentReached;
    
    // ✅ ไม่ปิดรอบอัตโนมัติแล้ว - ให้ driver ตัดสินใจเอง
    await activeTrip.save();
    
    // ✅ สร้างข้อความแจ้งเตือนใหม่
    let message = `✅ ສະແກນສຳເລັດ: ${activeTrip.current_passengers}/${activeTrip.car_capacity} ຄົນ`;
    let statusMessage = '';
    
    if (is80PercentReached && activeTrip.current_passengers < activeTrip.car_capacity) {
      statusMessage = `🎯 ຄົບເປົ້າໝາຍ ${activeTrip.required_passengers} ຄົນແລ້ວ! ສາມາດສືບຕໍ່ສະແກນຫຼືປິດຮອບໄດ້`;
    } else if (activeTrip.current_passengers === activeTrip.car_capacity) {
      statusMessage = `🚌 ລົດເຕັມແລ້ວ! ກະລຸນາປິດຮອບ`;
    } else {
      const remaining = activeTrip.required_passengers - activeTrip.current_passengers;
      if (remaining > 0) {
        statusMessage = `ຕ້ອງການອີກ ${remaining} ຄົນເພື່ອຄົບເປົ້າໝາຍ`;
      }
    }
    
    console.log('Trip updated successfully:', {
      tripId: activeTrip._id,
      currentPassengers: activeTrip.current_passengers,
      requiredPassengers: activeTrip.required_passengers,
      is80PercentReached: is80PercentReached,
      ticketScanned: ticket.ticketNumber
    });
    
    return NextResponse.json({
      success: true,
      trip_number: activeTrip.trip_number,
      current_passengers: activeTrip.current_passengers,
      required_passengers: activeTrip.required_passengers,
      car_capacity: activeTrip.car_capacity,
      occupancy_percentage: Math.round((activeTrip.current_passengers / activeTrip.car_capacity) * 100),
      progress_percentage: Math.round((activeTrip.current_passengers / activeTrip.required_passengers) * 100),
      is_80_percent_reached: is80PercentReached,
      can_complete_trip: true,
      trip_completed: false,
      message: message,
      status_message: statusMessage,
      ticket_info: {
        ticket_id: ticket._id,
        ticket_number: ticket.ticketNumber,
        price: ticket.price,
        passenger_order: passengerOrder
      }
    });

  } catch (error) {
    console.error('Scan QR Code Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to scan QR code',
        details: error instanceof Error ? error.stack : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}