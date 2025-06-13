// app/api/driver/trip/scan/route.ts - Enhanced with Group Ticket Support
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverTrip from '@/models/DriverTrip';
import Ticket from '@/models/Ticket';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// POST - สแกน QR Code หรือเลขตั๋ว (รองรับ Group Ticket)
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
    let groupTicketData = null;
    
    // ✅ ปรับการตรวจสอบ QR Code Data รองรับ Group Ticket
    if (qrData) {
      try {
        // ลองตรวจสอบว่าเป็น JSON ของ Group Ticket หรือไม่
        const parsedQRData = JSON.parse(qrData);
        
        if (parsedQRData.ticketType === 'group' && parsedQRData.ticketNumber) {
          // เป็น Group Ticket QR Code
          ticketNumber = parsedQRData.ticketNumber;
          groupTicketData = parsedQRData;
          console.log('✅ Group Ticket QR detected:', {
            ticketNumber,
            passengerCount: parsedQRData.passengerCount,
            totalPrice: parsedQRData.totalPrice
          });
        } else if (parsedQRData.ticketNumber) {
          // เป็น Individual Ticket QR Code แบบ JSON
          ticketNumber = parsedQRData.ticketNumber;
          console.log('✅ Individual Ticket QR (JSON) detected:', ticketNumber);
        }
      } catch (error) {
        // ถ้า parse ไม่ได้ ให้ใช้เป็น string ธรรมดา (Individual Ticket)
        console.log('QR data is plain string (Individual Ticket):', qrData);
        if (typeof qrData === 'string' && qrData.trim()) {
          ticketNumber = qrData.trim();
        }
      }
    }
    
    if (!ticketNumber || !ticketNumber.trim()) {
      return NextResponse.json(
        { error: 'ກະລຸນາໃສ່ເລກທີ່ປີ້' },
        { status: 400 }
      );
    }

    const driverId = session.user.id;
    const today = new Date().toISOString().split('T')[0];
    
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
    
    // ค้นหา ticket โดยใช้ ticketNumber
    const ticket = await Ticket.findOne({ ticketNumber: ticketNumber.trim() });
    if (!ticket) {
      return NextResponse.json(
        { error: `ບໍ່ພົບຂໍ້ມູນປີ້ເລກທີ ${ticketNumber}` },
        { status: 404 }
      );
    }
    
    // ตรวจสอบว่า ticket นี้ถูกสแกนไปแล้วในระบบหรือไม่
    const ticketUsedInSystem = await DriverTrip.findOne({
      'scanned_tickets.ticket_id': ticket._id
    });
    
    if (ticketUsedInSystem) {
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
          error: `❌ ປີ້ເລກທີ ${ticketNumber} ຖືກສະແກນໄປແລ້ວ`,
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
    
    // ✅ ตรวจสอบความจุรถรองรับ Group Ticket
    const passengersToAdd = ticket.ticketType === 'group' ? ticket.passengerCount : 1;
    const newTotalPassengers = activeTrip.current_passengers + passengersToAdd;
    
    if (newTotalPassengers > activeTrip.car_capacity) {
      return NextResponse.json(
        { error: `ລົດຈະເຕັມ! ປັດຈຸບັນ ${activeTrip.current_passengers} ຄົນ + ${passengersToAdd} ຄົນ = ${newTotalPassengers} ຄົນ (ຄວາມຈຸ: ${activeTrip.car_capacity} ຄົນ)` },
        { status: 400 }
      );
    }
    
    // ✅ เพิ่มผู้โดยสาร (รองรับ Group Ticket)
    const passengerOrder = activeTrip.current_passengers + 1;
    
    activeTrip.scanned_tickets.push({
      ticket_id: ticket._id,
      scanned_at: new Date(),
      passenger_order: passengerOrder
    });
    
    activeTrip.current_passengers = newTotalPassengers;
    
    // อัพเดท is_80_percent_reached
    const is80PercentReached = activeTrip.current_passengers >= activeTrip.required_passengers;
    activeTrip.is_80_percent_reached = is80PercentReached;
    
    await activeTrip.save();
    
    // ✅ สร้างข้อความแจ้งเตือนรองรับ Group Ticket
    let message = '';
    let statusMessage = '';
    
    if (ticket.ticketType === 'group') {
      message = `✅ สแกนปี้กลุ่มสำเร็จ: +${passengersToAdd} ຄົນ (รวม ${activeTrip.current_passengers}/${activeTrip.car_capacity} ຄົນ)`;
    } else {
      message = `✅ ສະແກນສຳເລັດ: ${activeTrip.current_passengers}/${activeTrip.car_capacity} ຄົນ`;
    }
    
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
      ticketScanned: ticket.ticketNumber,
      ticketType: ticket.ticketType,
      passengersAdded: passengersToAdd
    });
    
    // ✅ Response รองรับ Group Ticket
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
      
      // ✅ ข้อมูล ticket ที่สแกน
      ticket_info: {
        ticket_id: ticket._id,
        ticket_number: ticket.ticketNumber,
        ticket_type: ticket.ticketType,
        passenger_count: ticket.passengerCount,
        price: ticket.price,
        price_per_person: ticket.pricePerPerson,
        passenger_order: passengerOrder,
        passengers_added: passengersToAdd
      },
      
      // ✅ ข้อมูลเพิ่มเติมสำหรับ Group Ticket
      group_ticket_info: ticket.ticketType === 'group' ? {
        is_group_ticket: true,
        total_passengers_in_group: ticket.passengerCount,
        price_breakdown: {
          price_per_person: ticket.pricePerPerson,
          total_group_price: ticket.price,
          calculation: `₭${ticket.pricePerPerson.toLocaleString()} × ${ticket.passengerCount} = ₭${ticket.price.toLocaleString()}`
        }
      } : {
        is_group_ticket: false
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