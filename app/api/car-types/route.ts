// app/api/car-types/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CarType from '@/models/CarType';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - ดึงข้อมูลประเภทรถทั้งหมด
export async function GET(request: Request) {
  try {
    // ตรวจสอบ authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // ดึงข้อมูลประเภทรถทั้งหมด
    const carTypes = await CarType.find().sort({ carType_name: 1 });
    
    return NextResponse.json(carTypes);
  } catch (error) {
    console.error('Get Car Types Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch car types' },
      { status: 500 }
    );
  }
}

// POST - สร้างประเภทรถใหม่
export async function POST(request: Request) {
  try {
    // ตรวจสอบ authentication (เฉพาะ admin เท่านั้น)
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Only admins can create car types' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // รับข้อมูลจาก request body
    const body = await request.json();
    const { carType_name } = body;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!carType_name || !carType_name.trim()) {
      return NextResponse.json(
        { error: 'Car type name is required' },
        { status: 400 }
      );
    }
    
    // ตรวจสอบว่าประเภทรถนี้มีอยู่แล้วหรือไม่
    const existingCarType = await CarType.findOne({ 
      carType_name: { $regex: new RegExp(`^${carType_name.trim()}$`, 'i') }
    });
    
    if (existingCarType) {
      return NextResponse.json(
        { error: 'Car type with this name already exists' },
        { status: 409 }
      );
    }
    
    // สร้าง ID สำหรับประเภทรถ
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // หาประเภทรถล่าสุดเพื่อเพิ่มตัวนับ
    const latestCarType = await CarType.findOne().sort({ carType_id: -1 });
    let counter = 1;
    
    if (latestCarType && latestCarType.carType_id) {
      const match = latestCarType.carType_id.match(/\d+$/);
      if (match) {
        counter = parseInt(match[0]) + 1;
      }
    }
    
    const counterStr = counter.toString().padStart(3, '0');
    const autoGeneratedId = `CT-${year}${month}${day}-${counterStr}`;
    
    // สร้างประเภทรถใหม่
    const newCarType = await CarType.create({
      carType_id: autoGeneratedId,
      carType_name: carType_name.trim()
    });
    
    console.log('Car type created successfully with ID:', autoGeneratedId);
    
    return NextResponse.json(newCarType);
  } catch (error) {
    console.error('Create Car Type Error:', error);
    return NextResponse.json(
      { error: 'Failed to create car type: ' + (error as Error).message },
      { status: 500 }
    );
  }
}