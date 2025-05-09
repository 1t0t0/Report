import React from 'react';
import UserCard from '../UserCard';
import { Driver, User } from '../../types';
import { deleteUser, deleteDriverCars } from '../../api/user';
import notificationService from '@/lib/notificationService';

interface DriverListProps {
  drivers: Driver[];
  showConfirmation: (message: string, onConfirm: () => void) => void;
}

const DriverList: React.FC<DriverListProps> = ({ drivers, showConfirmation }) => {
  const [loading, setLoading] = React.useState(false);
  
  // ฟังก์ชันลบคนขับ
  const handleDeleteDriver = async (userId: string, role: string, name: string) => {
    showConfirmation(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບ ${name}?`, async () => {
      try {
        setLoading(true);
        
        // ลบรถที่เกี่ยวข้องกับคนขับ
        await deleteDriverCars(userId);
        
        // ลบผู้ใช้
        await deleteUser(userId);
        
        // ดึงข้อมูลใหม่ (ตรงนี้จะเป็นการรีเฟรชด้วย props onRefresh จาก UserCard)
        notificationService.success('ລຶບຜູ້ໃຊ້ສຳເລັດແລ້ວ');
      } catch (error: any) {
        console.error('Error deleting user:', error);
        notificationService.error(`ເກີດຂໍ້ຜິດພາດໃນການລຶບຜູ້ໃຊ້: ${error.message}`);
      } finally {
        setLoading(false);
      }
    });
  };
  
  // Handle refresh after check-in/out
  const handleRefresh = () => {
    // ตรงนี้จะแทนที่ด้วยการเรียก fetchUsers ผ่าน props ในการใช้งานจริง 
    // แต่ตอนนี้เป็นตัวอย่างโดยไม่มีการเรียก API จริง
    console.log('Refreshing driver list...');
  };
  
  // แสดงแถบโหลดหรือข้อความว่าไม่มีข้อมูลถ้าจำเป็น
  if (loading) {
    return (
      <div className="text-center py-8">
        <p>ກຳລັງໂຫລດ...</p>
      </div>
    );
  }
  
  if (drivers.length === 0) {
    return (
      <div className="text-center py-8">
        <p>ບໍ່ມີຂໍ້ມູນຄົນຂັບລົດ</p>
      </div>
    );
  }
  
  return (
    <div>
      {drivers.map((driver) => (
        <UserCard 
          key={driver._id}
          user={driver}
          onDelete={handleDeleteDriver}
          onRefresh={handleRefresh}
        />
      ))}
    </div>
  );
};

export default DriverList;