import React, { useState } from 'react';
import { createUser, createCarForDriver } from '../api/user';
import notificationService from '@/lib/notificationService';
import { TABS } from '../config/constants';
import useUserForm from '../hooks/useUserForm';
import { checkEmailExists } from '../api/emailValidator';


import DriverForm from './forms/DriverForm';
import StaffForm from './forms/StaffForm';
import AdminForm from './forms/AdminForm';
import StationForm from './forms/StationForm';

interface AddUserModalProps {
  activeTab: 'drivers' | 'staff' | 'admin' | 'station';
  onClose: () => void;
  onSuccess: () => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ 
  activeTab,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // ใช้ Custom hook สำหรับจัดการฟอร์ม
  const {
    user,
    car,
    updateUser,
    updateCar,
    idCardImageFile,
    userImageFile,
    setIdCardImageFile,
    setUserImageFile,
    resetForm,
    validateForm
  } = useUserForm(activeTab);
  
  // ฟังก์ชันจำลองการอัปโหลดรูปภาพ (ในระบบจริงต้องเชื่อมต่อกับ API)
  const uploadImage = async (file: File, type: 'idCard' | 'user') => {
    // โค้ดนี้เป็นการจำลองการอัปโหลด
    return new Promise<string>((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          // Return a fake URL
          resolve(`https://example.com/images/${type}-${Date.now()}.jpg`);
        }
      }, 100);
    });
  };
  
  // ฟังก์ชันบันทึกข้อมูลผู้ใช้
// แก้ไขฟังก์ชัน handleSubmit
// แก้ไขฟังก์ชัน handleSubmit

// แก้ไข handleSubmit ใน AddUserModal.tsx


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    // ตรวจสอบข้อมูลที่จำเป็น
    const isValid = validateForm();
    if (!isValid) {
      return;
    }
    
    setLoading(true);
    
    // ตรวจสอบอีเมลซ้ำก่อนที่จะดำเนินการต่อ
    try {
      // ถ้ามี API ตรวจสอบอีเมล
      if (typeof checkEmailExists === 'function') {
        const emailExists = await checkEmailExists(user.email);
        if (emailExists) {
          notificationService.error('ມີຜູ້ໃຊ້ທີ່ໃຊ້ອີເມວນີ້ແລ້ວ');
          setLoading(false);
          return;
        }
      }
    } catch (emailCheckError) {
      console.warn('Email check failed:', emailCheckError);
      // ดำเนินการต่อแม้ว่าการตรวจสอบอีเมลจะล้มเหลว
    }
    
    // อัปโหลดรูปภาพ (ถ้ามี)
    let idCardImageUrl = '';
    let userImageUrl = '';
    
    if (idCardImageFile) {
      idCardImageUrl = await uploadImage(idCardImageFile, 'idCard');
    }
    
    if (userImageFile) {
      userImageUrl = await uploadImage(userImageFile, 'user');
    }
    
    // เตรียมข้อมูลผู้ใช้สำหรับส่งไปยัง API
    const userData: NewUser = {
      name: user.name,
      email: user.email,
      password: user.password || '',
      role: user.role,
      phone: user.phone,
    };
    
    // เพิ่มข้อมูลเฉพาะตามประเภทผู้ใช้
    if (user.role === 'driver' || user.role === 'staff') {
      userData.status = 'active';
      userData.checkInStatus = 'checked-out';
      userData.idCardNumber = user.idCardNumber;
      
      if (idCardImageUrl) {
        userData.idCardImage = idCardImageUrl;
      }
      
      if (userImageUrl) {
        userData.userImage = userImageUrl;
      }
    } else if (user.role === 'station') {
      userData.location = user.location;
    }
    
    console.log('Creating user with data:', userData);
    
    // สร้างผู้ใช้
    let createdUser = null;
    try {
      createdUser = await createUser(userData);
      console.log('User created successfully:', createdUser);
    } catch (createUserError: any) {
      console.error('Error creating user:', createUserError);
      
      // ตรวจสอบข้อความข้อผิดพลาดเพื่อหาคำว่า "email" หรือ "already exists"
      if (createUserError.message && 
          (createUserError.message.toLowerCase().includes('email') || 
           createUserError.message.toLowerCase().includes('already exists'))) {
        notificationService.error('ມີຜູ້ໃຊ້ທີ່ໃຊ້ອີເມວນີ້ແລ້ວ');
      } else {
        notificationService.error(`ເກີດຂໍ້ຜິດພາດ: ${createUserError.message}`);
      }
      
      setLoading(false);
      return;
    }
    
    // ถ้าเป็นคนขับ ให้สร้างข้อมูลรถด้วย
    if (user.role === 'driver' && createdUser && createdUser._id) {
      try {
        console.log('Creating car for driver:', createdUser._id);
        
        const carData: NewCar = {
          car_name: car.car_name || '',
          car_capacity: car.car_capacity || 10,
          car_registration: car.car_registration || '',
          car_type: car.car_type || 'van',
        };
        
        // ตรวจสอบว่ามีข้อมูลรถครบถ้วนหรือไม่
        if (!carData.car_name || !carData.car_registration) {
          console.warn('Missing car data, skipping car creation');
        } else {
          console.log('Car data to create:', carData);
          
          const createdCar = await createCarForDriver(carData, createdUser._id);
          console.log('Car created successfully:', createdCar);
        }
      } catch (carError: any) {
        console.error('Error creating car:', carError);
        notificationService.warning(`ສ້າງຜູ້ໃຊ້ສຳເລັດແລ້ວ ແຕ່ມີຂໍ້ຜິດພາດໃນການສ້າງລົດ: ${carError.message}`);
        
        // ยังให้ทำงานต่อเนื่องถึงแม้การสร้างรถจะล้มเหลว
      }
    }
    
    // รีเซ็ตฟอร์มและรีเฟรชข้อมูล
    resetForm();
    onSuccess();
    onClose();
    
    // แสดงข้อความสำเร็จ
    notificationService.success(`ເພີ່ມ${TABS[activeTab]}ສຳເລັດແລ້ວ`);
    
  } catch (error: any) {
    console.error('Error adding user:', error);
    notificationService.error(`ເກີດຂໍ້ຜິດພາດ: ${error.message}`);
  } finally {
    setLoading(false);
    setUploadProgress(0);
  }
};
  
  // เลือกฟอร์มตามประเภทผู้ใช้
  const renderForm = () => {
    switch (activeTab) {
      case 'drivers':
        return (
          <DriverForm 
            user={user}
            car={car}
            updateUser={updateUser}
            updateCar={updateCar}
            idCardImageFile={idCardImageFile}
            userImageFile={userImageFile}
            setIdCardImageFile={setIdCardImageFile}
            setUserImageFile={setUserImageFile}
            uploadProgress={uploadProgress}
          />
        );
      case 'staff':
        return (
          <StaffForm 
            user={user}
            updateUser={updateUser}
            idCardImageFile={idCardImageFile}
            userImageFile={userImageFile}
            setIdCardImageFile={setIdCardImageFile}
            setUserImageFile={setUserImageFile}
            uploadProgress={uploadProgress}
          />
        );
      case 'admin':
        return <AdminForm user={user} updateUser={updateUser} />;
      case 'station':
        return <StationForm user={user} updateUser={updateUser} />;
      default:
        return null;
    }
  };
  
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">ເພີ່ມ{TABS[activeTab]}</h3>
            <button 
              className="text-gray-500 hover:text-gray-700 text-xl"
              onClick={onClose}
            >
              &times;
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            {renderForm()}
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                onClick={onClose}
              >
                ຍົກເລີກ
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={loading}
              >
                {loading ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;