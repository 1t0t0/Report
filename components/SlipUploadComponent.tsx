// components/SlipUploadComponent.tsx - Component สำหรับอัพโหลดสลิป
'use client';

import React, { useState, useRef } from 'react';
import { FiUpload, FiImage, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';

interface SlipUploadProps {
  onUploadSuccess: (url: string) => void;
  onUploadError: (error: string) => void;
  customerName?: string;
  bookingRef?: string;
  disabled?: boolean;
}

export default function SlipUploadComponent({
  onUploadSuccess,
  onUploadError,
  customerName = '',
  bookingRef = '',
  disabled = false
}: SlipUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      onUploadError('ປະເພດໄຟລ໌ບໍ່ຖືກຕ້ອງ อะนຸຍາດເຉພາะ JPG, PNG, WebP ເທົ່ານັ້ນ');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      onUploadError('ໄຟລ໌ໃຫຍ່ເກີນໄປ ຂະໜາດໄຟລ໌ຕ້ອງບໍ່ເກີນ 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadFile(file);
  };

  // Upload file to API
  const uploadFile = async (file: File) => {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('slip', file);
      formData.append('customerName', customerName);
      formData.append('bookingRef', bookingRef);

      const response = await fetch('/api/upload-slip', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadedUrl(result.url);
        onUploadSuccess(result.url);
      } else {
        onUploadError(result.error || 'ເກີດຂໍ້ຜິດພາດໃນການອັບໂຫຼດ');
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError('ເກີດຂໍ້ຜິດພາດໃນການອັບໂຫຼດ');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || uploading) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  // Clear upload
  const clearUpload = () => {
    setPreviewUrl(null);
    setUploadedUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        ສະລິບການໂອນເງິນ *
      </label>
      
      {!previewUrl ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : disabled
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled || uploading}
          />
          
          <div className="flex flex-col items-center">
            <FiUpload className={`h-12 w-12 mb-4 ${
              disabled ? 'text-gray-300' : 'text-gray-400'
            }`} />
            <p className={`text-lg font-medium mb-2 ${
              disabled ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {uploading ? 'ກຳລັງອັບໂຫຼດ...' : 'ຄລິກ ຫຼື ລາກໄຟລ໌ມາວາງຂວາ'}
            </p>
            <p className={`text-sm ${
              disabled ? 'text-gray-300' : 'text-gray-500'
            }`}>
              JPG, PNG, WebP (ສູງສຸດ 5MB)
            </p>
          </div>
          
          {uploading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                <span className="text-blue-600 font-medium">ກຳລັງອັບໂຫຼດ...</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <img
                  src={previewUrl}
                  alt="Payment slip preview"
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {uploadedUrl ? (
                    <FiCheck className="h-5 w-5 text-green-600" />
                  ) : uploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></div>
                  ) : (
                    <FiAlertCircle className="h-5 w-5 text-orange-500" />
                  )}
                  <span className={`font-medium ${
                    uploadedUrl ? 'text-green-700' : uploading ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {uploadedUrl ? 'ອັບໂຫຼດສຳເລັດແລ້ວ' : uploading ? 'ກຳລັງອັບໂຫຼດ...' : 'ກຳລັງປະມວນຜົນ...'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  ໄຟລ໌ສະລິບການໂອນເງິນພ້ອມແລ້ວ
                </p>
              </div>
              <button
                onClick={clearUpload}
                disabled={uploading}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <p className="mt-2 text-xs text-gray-500">
        💡 <strong>คำแนะนำ:</strong> ໃຫ້ແນ່ໃຈວ່າສະລິບການໂອນເງິນຊັດເຈນ ແລະ ເຫັນຂໍ້ມູນຄົບຖ້ວນ
      </p>
    </div>
  );
}