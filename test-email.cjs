// test-email.cjs - ใช้ CommonJS (.cjs extension)
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🧪 Testing email configuration...');
  
  // ตั้งค่าโดยตรง (ใช้อีเมลที่เห็นจาก log)
  const emailConfig = {
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: 587,
    SMTP_USER: 'totophandolack915@gmail.com',
    SMTP_PASS: 'ntiq xpfp icey zguo',
    SMTP_FROM: 'Bus Ticket System <totophandolack915@gmail.com>'
  };
  
  console.log('📧 Testing with email:', emailConfig.SMTP_USER);
  console.log('🏠 SMTP Host:', emailConfig.SMTP_HOST);
  console.log('🔌 SMTP Port:', emailConfig.SMTP_PORT);
  
  const transporter = nodemailer.createTransport({
    host: emailConfig.SMTP_HOST,
    port: emailConfig.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: emailConfig.SMTP_USER,
      pass: emailConfig.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔗 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    console.log('📧 Sending test email...');
    const result = await transporter.sendMail({
      from: emailConfig.SMTP_FROM,
      to: emailConfig.SMTP_USER, // ส่งให้ตัวเอง
      subject: '🎯 ทดสอบระบบอีเมล Bus Ticket System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🎉 ระบบอีเมลทำงานได้แล้ว!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Bus Ticket System</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px;">
            <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #374151; margin: 0 0 15px 0;">📊 ผลการทดสอบ</h3>
              <p style="margin: 5px 0;"><strong>เวลาทดสอบ:</strong> ${new Date().toLocaleString('th-TH')}</p>
              <p style="margin: 5px 0;"><strong>ส่งจาก:</strong> ${emailConfig.SMTP_USER}</p>
              <p style="margin: 5px 0;"><strong>App Password:</strong> <span style="color: #10B981; font-weight: bold;">ใช้งานได้ถูกต้อง ✅</span></p>
              <p style="margin: 5px 0;"><strong>SMTP Host:</strong> ${emailConfig.SMTP_HOST}</p>
              <p style="margin: 5px 0;"><strong>SMTP Port:</strong> ${emailConfig.SMTP_PORT}</p>
            </div>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 6px; border-left: 4px solid #10B981;">
              <h3 style="color: #2d5a2d; margin: 0 0 15px 0;">🚀 พร้อมใช้งานแล้ว!</h3>
              <p style="color: #2d5a2d; margin: 0 0 15px 0;">ตอนนี้ระบบสามารถส่งอีเมลแจ้งการอนุมัติ/ปฏิเสธการจองได้แล้ว</p>
              
              <h4 style="color: #2d5a2d; margin: 15px 0 10px 0;">📋 ขั้นตอนต่อไป:</h4>
              <ol style="color: #2d5a2d; margin: 0; padding-left: 20px;">
                <li style="margin: 5px 0;">อัพเดท .env.local ด้วยอีเมล: <code>totophandolack915@gmail.com</code></li>
                <li style="margin: 5px 0;">รีสตาร์ท Next.js server: <code>npm run dev</code></li>
                <li style="margin: 5px 0;">ทดสอบอนุมัติการจองในระบบจริง</li>
                <li style="margin: 5px 0;">ตรวจสอบอีเมล (รวม Spam folder)</li>
              </ol>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #ffc107;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>💡 เคล็ดลับ:</strong> ถ้าไม่เห็นอีเมลในกล่องขาเข้า ลองดูในโฟลเดอร์ Spam หรือ Promotions
              </p>
            </div>
          </div>
        </div>
      `
    });

    console.log('🎊 ส่งอีเมลทดสอบสำเร็จ!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📬 กรุณาตรวจสอบอีเมล totophandolack915@gmail.com');
    console.log('   (รวมถึง Spam folder และ Promotions tab)');
    
    console.log('\n🎯 ขั้นตอนต่อไป:');
    console.log('   1. อัพเดท .env.local:');
    console.log('      SMTP_USER=totophandolack915@gmail.com');
    console.log('      SMTP_FROM="Bus Ticket System <totophandolack915@gmail.com>"');
    console.log('   2. รีสตาร์ท: npm run dev');
    console.log('   3. ทดสอบอนุมัติการจองในระบบ');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    
    console.log('\n📧 Config ที่ใช้:');
    console.log('   Host:', emailConfig.SMTP_HOST);
    console.log('   Port:', emailConfig.SMTP_PORT);
    console.log('   User:', emailConfig.SMTP_USER);
    console.log('   Pass:', emailConfig.SMTP_PASS.substring(0, 8) + '...');
    
    // แสดงคำแนะนำตามประเภทข้อผิดพลาด
    if (error.message.includes('Invalid login') || error.message.includes('Username and Password not accepted')) {
      console.log('\n💡 ปัญหา: การเข้าสู่ระบบไม่ถูกต้อง');
      console.log('   แก้ไข:');
      console.log('   ✅ ตรวจสอบว่าเปิด 2-Factor Authentication แล้ว');
      console.log('   ✅ ใช้ App Password แทนรหัสผ่านปกติ');
      console.log('   ✅ App Password ต้องเป็น: ntiq xpfp icey zguo');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('\n💡 ปัญหา: ไม่สามารถเชื่อมต่อ SMTP server');
      console.log('   แก้ไข:');
      console.log('   ✅ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
      console.log('   ✅ ตรวจสอบ Firewall หรือ VPN');
    }

    if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
      console.log('\n💡 ปัญหา: การเชื่อมต่อหมดเวลา');
      console.log('   แก้ไข:');
      console.log('   ✅ อาจมี Firewall หรือ Antivirus บล็อก port 587');
      console.log('   ✅ ลองใช้ port 465 แทน (secure: true)');
    }

    if (error.message.includes('self signed certificate')) {
      console.log('\n💡 ปัญหา: SSL Certificate');
      console.log('   แก้ไข: เพิ่ม tls: { rejectUnauthorized: false }');
    }
  }
}

// รันฟังก์ชันทดสอบ
testEmail().then(() => {
  console.log('\n✨ การทดสอบเสร็จสิ้น');
}).catch((error) => {
  console.error('💥 Unexpected Error:', error);
});