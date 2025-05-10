// app/api/users/check-email/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
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
    
    // Get email from query parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }
    
    // Check if user with this email exists
    const existingUser = await User.findOne({ email });
    
    return NextResponse.json({
      exists: !!existingUser
    });
  } catch (error) {
    console.error('Check Email Error:', error);
    return NextResponse.json(
      { error: 'Failed to check email', exists: false },
      { status: 500 }
    );
  }
}