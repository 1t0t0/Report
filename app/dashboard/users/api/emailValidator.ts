// สร้างฟังก์ชัน checkEmailExists

/**
 * ตรวจสอบว่ามีผู้ใช้ที่มีอีเมลนี้อยู่ในระบบแล้วหรือไม่
 * @param email อีเมลที่ต้องการตรวจสอบ
 * @returns boolean ค่าความจริง true ถ้ามีอีเมลนี้อยู่แล้ว, false ถ้าไม่มี
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    // สร้าง URL สำหรับ API ตรวจสอบอีเมล
    const url = `/api/users/check-email?email=${encodeURIComponent(email)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      // ถ้าการตรวจสอบล้มเหลว ให้ถือว่าอีเมลไม่ซ้ำเพื่อให้ระบบทำงานต่อได้
      console.error('Error checking email:', response.statusText);
      return false;
    }
    
    const data = await response.json();
    return data.exists; // ควรส่งค่า exists: true/false จาก API
  } catch (error) {
    console.error('Error checking email existence:', error);
    // ถ้ามีข้อผิดพลาด ให้ถือว่าอีเมลไม่ซ้ำเพื่อให้ระบบทำงานต่อได้
    return false;
  }
}