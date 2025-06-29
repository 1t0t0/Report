// app/dashboard/users/components/forms/shared.tsx - Fixed phone formatting issue
import React, { useState } from 'react';
import { FiRefreshCw, FiCamera, FiX } from 'react-icons/fi';
import { resetUserPassword } from '../../api/user';
import notificationService from '@/lib/notificationService';

interface FormFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  min?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
}

export const FormField: React.FC<FormFieldProps> = ({ 
  label, type = 'text', value, onChange, placeholder, required, min, icon, disabled, className = '', maxLength
}) => {
  const baseClasses = `w-full border-2 border-gray-300 rounded p-2 focus:border-blue-500 focus:outline-none ${icon ? 'pl-10' : ''} ${className}`;

  return (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={baseClasses}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          min={min}
          disabled={disabled}
          maxLength={maxLength}
        />
      </div>
    </div>
  );
};

// Fixed Phone Number Input Component - เก็บเป็นตัวเลขธรรมดา
interface PhoneFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export const PhoneField: React.FC<PhoneFieldProps> = ({
  label, value, onChange, required, disabled, icon
}) => {
  // ไม่ทำการ format แล้ว - เก็บเป็นตัวเลขธรรมดา
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // อนุญาตเฉพาะตัวเลขและขีดกลาง (สำหรับผู้ใช้ที่ต้องการใส่เอง)
    const cleanValue = inputValue.replace(/[^\d-]/g, '');
    
    // จำกัดความยาว (เบอร์ลาว 8-10 หลัก + ขีดกลาง)
    if (cleanValue.length <= 12) {
      onChange(cleanValue);
    }
  };

  const baseClasses = `w-full border-2 border-gray-300 rounded p-2 focus:border-blue-500 focus:outline-none ${icon ? 'pl-10' : ''}`;

  return (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            {icon}
          </div>
        )}
        <input
          type="tel"
          className={baseClasses}
          placeholder="20XXXXXXXX หรือ 020-XXXX-XXXX"
          value={value}
          onChange={handleChange}
          required={required}
          disabled={disabled}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        ໃສ່ເບີໂທໃຫ້ຖືກຕ້ອງ (ຕົວຢ່າງ: 20xxxxxxxx)
      </p>
    </div>
  );
};

export const usePasswordReset = (userId: string | undefined, updateUser: (field: string, value: string) => void) => {
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = await resetUserPassword(userId);
      setTempPassword(response.temporaryPassword);
      setShowTempPassword(true);
      updateUser('password', response.temporaryPassword);
      notificationService.success('ລີເຊັດລະຫັດຜ່ານສຳເລັດ');
    } catch (error: any) {
      notificationService.error(`ເກີດຂໍ້ຜິດພາດ: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return { showTempPassword, tempPassword, loading, handleReset };
};

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  isEditing?: boolean;
  onReset?: () => void;
  loading?: boolean;
  showTempPassword?: boolean;
  tempPassword?: string;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  value, onChange, isEditing, onReset, loading, showTempPassword, tempPassword
}) => (
  <div>
    <label className="block text-sm font-bold mb-2">ລະຫັດຜ່ານ</label>
    <div className="relative">
      <input
        type="text"
        className="w-full border-2 border-gray-300 rounded p-2 pr-10 focus:border-blue-500 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isEditing ? "ໃສ່ລະຫັດຜ່ານໃໝ່ ຫຼື ປ່ອຍວ່າງຄືເກົ່າ" : "ລະຫັດຜ່ານ"}
      />
      {isEditing && onReset && (
        <button
          type="button"
          className="absolute right-2 top-2 text-blue-500 hover:text-blue-700 transition-colors"
          onClick={onReset}
          disabled={loading}
        >
          <FiRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
    {showTempPassword && tempPassword && (
      <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-md">
        <p className="text-sm text-yellow-800">
          ລະຫັດຜ່ານຊົ່ວຄາວ: <strong>{tempPassword}</strong>
        </p>
      </div>
    )}
  </div>
);

interface ImageUploadProps {
  label: string;
  file: File | null;
  preview?: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  id: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label, file, preview, onFileChange, onRemove, id
}) => (
  <div>
    <label className="block text-sm font-bold mb-2">{label}</label>
    <input type="file" accept="image/*" className="hidden" id={id} onChange={onFileChange} />
    <label
      htmlFor={id}
      className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
    >
      {file || preview ? (
        <div className="relative w-full h-full">
          <img 
            src={file ? URL.createObjectURL(file) : preview || ''}
            alt={`${label} Preview`} 
            className="w-full h-full object-contain p-2 rounded"
          />
          <button 
            type="button"
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            onClick={(e) => { e.preventDefault(); onRemove(); }}
          >
            <FiX size={14} />
          </button>
        </div>
      ) : (
        <div className="text-center">
          <FiCamera className="mx-auto text-3xl text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">{label}</p>
        </div>
      )}
    </label>
  </div>
);