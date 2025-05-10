// แก้ไข useUserData hook

import { useState, useCallback } from 'react';
import { fetchAllUsers, fetchCarsByUser } from '../api/user';
import { User, Driver, Car, ApiError } from '../types';
import notificationService from '@/lib/notificationService';

export default function useUserData() {
  // State สำหรับข้อมูลผู้ใช้
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [ticketSellers, setTicketSellers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [stations, setStations] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมด
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // ดึงข้อมูลผู้ใช้ทั้งหมด
      let userData: User[] = [];
      
      try {
        userData = await fetchAllUsers();
      } catch (userError: any) {
        console.error('Error fetching users:', userError);
        notificationService.error(`ບໍ່ສາມາດດຶງຂໍ້ມູນຜູ້ໃຊ້ໄດ້: ${userError.message}`);
        userData = [];
      }
      
      // แยกประเภทผู้ใช้
      const driverUsers = userData.filter((user: User) => user.role === 'driver');
      const staffUsers = userData.filter((user: User) => user.role === 'staff');
      const adminUsers = userData.filter((user: User) => user.role === 'admin');
      const stationUsers = userData.filter((user: User) => user.role === 'station');
      
      // ดึงข้อมูลรถที่เกี่ยวข้องกับคนขับ
      const driverIds = driverUsers.map(driver => driver._id);
      
      let carsData: Car[] = [];
      
      if (driverIds.length > 0) {
        try {
          carsData = await fetchCarsByUser();
        } catch (carError: any) {
          console.error('Error fetching cars:', carError);
          notificationService.warning(`ດຶງຂໍ້ມູນຜູ້ໃຊ້ສຳເລັດແລ້ວ ແຕ່ບໍ່ສາມາດດຶງຂໍ້ມູນລົດໄດ້: ${carError.message}`);
          carsData = [];
        }
        
        // Map รถให้กับคนขับแต่ละคน
        const driversWithCars = driverUsers.map((driver: Driver) => {
          const assignedCar = carsData.find((car: Car) => car.user_id === driver._id);
          return { ...driver, assignedCar };
        });
        
        setDrivers(driversWithCars);
      } else {
        setDrivers(driverUsers);
      }
      
      // อัปเดตสถานะ
      setTicketSellers(staffUsers);
      setAdmins(adminUsers);
      setStations(stationUsers);
      
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      notificationService.error(`ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນ: ${(error as ApiError).message || 'Unknown error'}`);
      
      // กำหนดค่าเริ่มต้นเพื่อให้แอปพลิเคชันยังทำงานต่อได้
      setDrivers([]);
      setTicketSellers([]);
      setAdmins([]);
      setStations([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    drivers,
    ticketSellers,
    admins,
    stations,
    loading,
    fetchUsers
  };
}