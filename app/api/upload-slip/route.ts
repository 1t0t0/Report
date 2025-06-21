// app/api/upload-slip/route.ts - API สำหรับอัพโหลดสลิปการโอนเงิน
import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  try {
    console.log('📤 Upload slip request received');
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('slip') as File;
    const customerName = formData.get('customerName') as string;
    const bookingRef = formData.get('bookingRef') as string; // Optional reference
    
    // Validate file presence
    if (!file) {
      return NextResponse.json(
        { error: 'ກະລຸນາເລືອກໄຟລ໌ສະລິບການໂອນເງິນ' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'ປະເພດໄຟລ໌ບໍ່ຖືກຕ້ອງ', 
          details: 'ອະນຸຍາດເຉພາະ JPG, PNG, WebP ເທົ່ານັ້ນ' 
        },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: 'ໄຟລ໌ໃຫຍ່ເກີນໄປ', 
          details: 'ຂະໜາດໄຟລ໌ຕ້ອງບໍ່ເກີນ 5MB' 
        },
        { status: 400 }
      );
    }
    
    console.log('✅ File validation passed:', {
      name: file.name,
      type: file.type,
      size: file.size,
      customerName,
      bookingRef
    });
    
    try {
      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Convert to base64 for Cloudinary
      const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const cleanCustomerName = customerName ? customerName.replace(/[^a-zA-Z0-9]/g, '_') : 'anonymous';
      const publicId = `payment_slips/${cleanCustomerName}_${timestamp}_${randomString}`;
      
      console.log('☁️ Uploading to Cloudinary with publicId:', publicId);
      
      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(base64Image, {
        folder: 'bus-ticket-system/payment-slips',
        public_id: publicId,
        transformation: [
          { 
            width: 800, 
            height: 800, 
            crop: "limit", 
            quality: "auto:good",
            format: "jpg"
          }
        ],
        // Add metadata
        context: {
          customer_name: customerName || 'Unknown',
          booking_ref: bookingRef || '',
          upload_date: new Date().toISOString(),
          original_filename: file.name
        }
      });
      
      console.log('✅ Upload successful:', {
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        size: uploadResult.bytes
      });
      
      // Return success response with URL
      return NextResponse.json({
        success: true,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        originalSize: file.size,
        compressedSize: uploadResult.bytes,
        message: 'ອັບໂຫຼດສະລິບສຳເລັດແລ້ວ'
      });
      
    } catch (cloudinaryError: any) {
      console.error('❌ Cloudinary upload error:', cloudinaryError);
      
      // Handle specific Cloudinary errors
      if (cloudinaryError.message?.includes('Invalid image file')) {
        return NextResponse.json(
          { error: 'ໄຟລ໌ຮູບບໍ່ຖືກຕ້ອງ ກະລຸນາເລືອກໄຟລ໌ໃໝ່' },
          { status: 400 }
        );
      }
      
      if (cloudinaryError.message?.includes('File size too large')) {
        return NextResponse.json(
          { error: 'ໄຟລ໌ໃຫຍ່ເກີນໄປສຳລັບ Cloudinary' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'ເກີດຂໍ້ຜິດພາດໃນການອັບໂຫຼດ',
          details: 'ກະລຸນາລອງໃໝ່ອີກຄັ້ງ'
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('💥 Upload slip error:', error);
    
    // Handle specific errors
    if (error.message?.includes('FormData')) {
      return NextResponse.json(
        { error: 'ຂໍ້ມູນໄຟລ໌ບໍ່ຖືກຕ້ອງ' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'ເກີດຂໍ້ຜິດພາດໃນລະບົບ',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - ดึงข้อมูลการอัพโหลด (สำหรับ debug หรือ admin)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');
    
    if (!publicId) {
      return NextResponse.json(
        { error: 'Missing publicId parameter' },
        { status: 400 }
      );
    }
    
    // Get image info from Cloudinary
    const result = await cloudinary.api.resource(publicId);
    
    return NextResponse.json({
      success: true,
      imageInfo: {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        createdAt: result.created_at,
        context: result.context
      }
    });
    
  } catch (error: any) {
    console.error('Get image info error:', error);
    
    if (error.http_code === 404) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get image info' },
      { status: 500 }
    );
  }
}