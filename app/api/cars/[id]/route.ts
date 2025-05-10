// app/api/cars/[id]/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Car from '@/models/Car';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Get a single car by ID with driver information
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid car ID format' },
        { status: 400 }
      );
    }
    
    // Find car by ID and populate user data
    const car = await Car.findById(params.id)
      .populate({
        path: 'user_id',
        select: 'name email role employeeId phone checkInStatus status'
      });
    
    if (!car) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(car);
  } catch (error) {
    console.error('Get Car Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch car' },
      { status: 500 }
    );
  }
}

// PUT - Update a car (including assigning/removing driver)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Parse request body
    const body = await request.json();
    const { car_name, car_capacity, car_registration, car_type, user_id } = body;
    
    // Build update object
    const updateData: any = {};
    
    if (car_name !== undefined) updateData.car_name = car_name;
    if (car_capacity !== undefined) updateData.car_capacity = car_capacity;
    if (car_registration !== undefined) updateData.car_registration = car_registration;
    if (car_type !== undefined) updateData.car_type = car_type;
    
    // Handle special case: explicitly setting null to remove driver association
    if (user_id === null) {
      updateData.user_id = null;
    } else if (user_id !== undefined) {
      updateData.user_id = user_id;
    }
    
    // Find and update car
    const car = await Car.findByIdAndUpdate(
      params.id,
      { $set: updateData },
      { new: true }
    ).populate({
      path: 'user_id',
      select: 'name email role employeeId phone checkInStatus status'
    });
    
    if (!car) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(car);
  } catch (error) {
    console.error('Update Car Error:', error);
    return NextResponse.json(
      { error: 'Failed to update car' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a car
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Find and delete car
    const car = await Car.findByIdAndDelete(params.id);
    
    if (!car) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Car Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete car' },
      { status: 500 }
    );
  }
}