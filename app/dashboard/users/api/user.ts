// API functions สำหรับการจัดการผู้ใช้
import { User, NewUser, NewCar } from '../types';

// ดึงข้อมูลผู้ใช้ทั้งหมด
export async function fetchAllUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  
  return response.json();
}

// ดึงข้อมูลผู้ใช้ตามบทบาท
export async function fetchUsersByRole(role: string): Promise<User[]> {
  const response = await fetch(`/api/users?role=${role}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${role}s`);
  }
  
  return response.json();
}

// ดึงข้อมูลรถทั้งหมด
// แก้ไขฟังก์ชัน fetchCarsByUser

export async function fetchCarsByUser(): Promise<any[]> {
  try {
    const response = await fetch('/api/cars');
    
    if (!response.ok) {
      // ถ้าได้รับ error status code
      const errorText = await response.text();
      console.error('Car fetch error response:', errorText);
      
      let errorMsg = 'Failed to fetch cars';
      try {
        // พยายามแปลง error เป็น JSON
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMsg = errorData.error;
        }
      } catch (e) {
        // ถ้าไม่สามารถแปลงเป็น JSON ได้ ใช้ errorText
        errorMsg = errorText || 'Unknown error';
      }
      
      throw new Error(errorMsg);
    }
    
    // ตรวจสอบว่า response มีข้อมูลหรือไม่
    const text = await response.text();
    if (!text || text.trim() === '') {
      console.warn('Car fetch response is empty');
      return [];
    }
    
    try {
      // พยายามแปลงเป็น JSON
      const data = JSON.parse(text);
      
      if (Array.isArray(data)) {
        return data;
      } else {
        console.warn('Car fetch response is not an array:', data);
        return [];
      }
    } catch {
      console.error('Failed to parse car data as JSON:', text);
      throw new Error('Invalid car data format received from server');
    }
  } catch (error: any) {
    console.error('Error fetching cars:', error);
    // ส่งคืนอาร์เรย์ว่างแทนที่จะโยน error เพื่อให้แอปทำงานต่อได้
    return [];
  }
}

// เปลี่ยนสถานะการเช็คอิน/เช็คเอาท์
export async function checkInOutUser(userId: string, status: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkInStatus: status }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update check in status');
  }
}

// สร้างผู้ใช้ใหม่
// แก้ไขฟังก์ชัน createUser

export async function createUser(userData: NewUser): Promise<User> {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      // ดึงข้อความข้อผิดพลาดจาก response
      const responseText = await response.text();
      
      // พยายามแปลงข้อความเป็น JSON เพื่อดึงข้อความข้อผิดพลาด
      let errorMessage = 'Failed to create user';
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error) {
          errorMessage = errorData.error;
          
          // กรณี email ซ้ำ ให้แสดงข้อความเฉพาะ
          if (errorMessage.includes('already exists')) {
            errorMessage = 'ມີຜູ້ໃຊ້ທີ່ໃຊ້ອີເມວນີ້ແລ້ວ';
          }
        }
      } catch (e) {
        // ถ้าไม่สามารถแปลงเป็น JSON ได้ ใช้ response status
        if (response.status === 409) {
          errorMessage = 'ມີຜູ້ໃຊ້ທີ່ໃຊ້ອີເມວນີ້ແລ້ວ';
        } else {
          errorMessage = responseText || `Error: ${response.status} ${response.statusText}`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new Error(error.message || 'Failed to create user');
  }
}

// สร้างรถสำหรับคนขับ
// แก้ไขฟังก์ชัน createCarForDriver

export async function createCarForDriver(carData: NewCar, driverId: string): Promise<any> {
  try {
    const response = await fetch('/api/cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...carData,
        user_id: driverId,
      }),
    });
    
    if (!response.ok) {
      // ดึงข้อมูล error message จาก response
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Failed to create car';
      } catch (jsonError) {
        // ถ้าไม่สามารถแปลง response เป็น JSON ได้
        errorMessage = `Failed to create car: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    // ตรวจสอบว่า response มีข้อมูลหรือไม่ก่อนแปลงเป็น JSON
    const text = await response.text();
    if (!text) {
      return { success: true }; // ส่งคืนค่าว่าสำเร็จแต่ไม่มีข้อมูล
    }
    
    try {
      // พยายามแปลงเป็น JSON
      const data = JSON.parse(text);
      return data;
    } catch (err) {
      // ถ้าแปลงเป็น JSON ไม่ได้ แต่ response.ok เป็น true แสดงว่าสำเร็จ
      console.warn('Response is not valid JSON but request was successful');
      return { success: true, message: text };
    }
  } catch (error: any) {
    console.error('Error creating car for driver:', error);
    throw new Error(error.message || 'Failed to create car');
  }
}

// ลบผู้ใช้
export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete user');
  }
}

// ลบรถที่เกี่ยวข้องกับคนขับ
export async function deleteDriverCars(driverId: string): Promise<void> {
  const response = await fetch(`/api/cars/by-driver/${driverId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Failed to delete associated cars:', errorData);
  }
}