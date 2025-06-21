// lib/cloudinaryConfig.ts - ตรวจสอบ Cloudinary configuration
import { v2 as cloudinary } from 'cloudinary';

// Ensure Cloudinary is configured
if (!process.env.CLOUDINARY_CLOUD_NAME || 
    !process.env.CLOUDINARY_API_KEY || 
    !process.env.CLOUDINARY_API_SECRET) {
  console.warn('⚠️ Cloudinary environment variables not found. Please set:');
  console.warn('- CLOUDINARY_CLOUD_NAME');
  console.warn('- CLOUDINARY_API_KEY');
  console.warn('- CLOUDINARY_API_SECRET');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS URLs
});

// Utility function to validate Cloudinary setup
export const validateCloudinarySetup = async (): Promise<boolean> => {
  try {
    await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful');
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error);
    return false;
  }
};

// Utility function to delete image
export const deleteImage = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Failed to delete image:', error);
    return false;
  }
};

// Utility function to get optimized URL
export const getOptimizedUrl = (publicId: string, options?: {
  width?: number;
  height?: number;
  quality?: string;
  format?: string;
}): string => {
  return cloudinary.url(publicId, {
    width: options?.width || 400,
    height: options?.height || 400,
    crop: 'fill',
    quality: options?.quality || 'auto',
    format: options?.format || 'auto',
    secure: true
  });
};

export default cloudinary;