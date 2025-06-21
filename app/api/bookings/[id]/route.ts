// app/api/bookings/[id]/route.ts - Enhanced with Email Notifications
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Ticket from '@/models/Ticket';
import jwt from 'jsonwebtoken';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import nodemailer from 'nodemailer';

// Email Configuration
const createEmailTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 SMTP not configured, email will be skipped');
    return null;
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// app/api/bookings/[id]/route.ts - Updated QR Code generation to match useTicketSales

async function generateTicketQRCodeBuffer(ticket: any): Promise<Buffer | null> {
  try {
    console.log('🎯 Generating QR Code buffer for ticket:', ticket.ticketNumber);
    
    const QRCode = await import('qrcode');
    
    // Use the same QR data generation logic as useTicketSales
    let qrData;
    if (ticket.ticketType === 'group') {
      qrData = JSON.stringify({
        ticketNumber: ticket.ticketNumber,
        passengerCount: ticket.passengerCount
      });
    } else {
      qrData = ticket.ticketNumber;
    }
    
    // Generate QR Code as PNG buffer (more reliable for email)
    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { 
        dark: '#000000', 
        light: '#FFFFFF' 
      }
    });
    
    console.log('✅ QR Code buffer generated, size:', qrCodeBuffer.length, 'bytes');
    return qrCodeBuffer;
    
  } catch (error) {
    console.error('❌ Error generating QR code buffer:', error);
    return null;
  }
}

// ✅ Alternative: QR Code as CID (Content-ID) embedded image
async function sendApprovalEmailWithAttachment(booking: any, ticket: any) {
  const transporter = createEmailTransporter();
  
  if (!transporter) {
    console.log('📧 Email transporter not available, skipping email');
    return;
  }
  
  try {
    // ✅ Generate QR Code as buffer
    const qrCodeBuffer = await generateTicketQRCodeBuffer(ticket);
    
    const ticketTypeDisplay = ticket.ticketType === 'group' 
      ? `ປີ້ກຸ່ມ ${ticket.passengerCount} ຄົນ` 
      : 'ປີ້ບຸກຄົນ';
    
    const priceInfo = ticket.ticketType === 'group'
      ? `${ticket.passengerCount} ຄົນ × ₭${ticket.pricePerPerson.toLocaleString()} = ₭${ticket.price.toLocaleString()}`
      : `₭${ticket.price.toLocaleString()}`;

    // ✅ Email with embedded QR Code using CID
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@busticketsystem.com',
      to: booking.customer_email,
      subject: `✅ ການຈອງໄດ້ຮັບການອະນຸມັດ - ${booking.booking_id}`,
      html: `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>ການຈອງໄດ້ຮັບການອະນຸມັດ</title>
          <style type="text/css">
            body, table, td, p, a, li, blockquote {
              -webkit-text-size-adjust: 100%;
              -ms-text-size-adjust: 100%;
            }
            table, td {
              mso-table-lspace: 0pt;
              mso-table-rspace: 0pt;
            }
            img {
              -ms-interpolation-mode: bicubic;
              border: 0;
              height: auto;
              line-height: 100%;
              outline: none;
              text-decoration: none;
              display: block;
            }
            
            body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #f4f4f4;
              font-family: Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #333333;
            }
            
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            
            .header-section {
              background: linear-gradient(135deg, #10B981 0%, #059669 100%);
              padding: 30px 20px;
              text-align: center;
              color: #ffffff;
            }
            
            .content-section {
              padding: 30px 20px;
              background-color: #f8f9fa;
            }
            
            .highlight-box {
              background-color: #d1fae5;
              border-left: 4px solid #10B981;
              padding: 20px;
              margin: 20px 0;
              border-radius: 0 8px 8px 0;
            }
            
            .details-table {
              width: 100%;
              background-color: #ffffff;
              border-radius: 8px;
              margin: 20px 0;
              border-collapse: collapse;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .details-table td {
              padding: 12px 20px;
              border-bottom: 1px solid #eeeeee;
              vertical-align: top;
            }
            
            .details-table tr:last-child td {
              border-bottom: none;
            }
            
            .qr-section {
              background-color: #ffffff;
              border: 2px solid #10B981;
              border-radius: 12px;
              margin: 25px 0;
              text-align: center;
              overflow: hidden;
            }
            
            .qr-header {
              background: linear-gradient(135deg, #10B981 0%, #059669 100%);
              color: #ffffff;
              padding: 15px 20px;
              font-size: 18px;
              font-weight: bold;
              margin: 0;
            }
            
            .qr-content {
              padding: 25px 20px;
            }
            
            .ticket-badge {
              display: inline-block;
              background-color: #10B981;
              color: #ffffff;
              padding: 8px 16px;
              border-radius: 20px;
              font-weight: bold;
              margin-bottom: 15px;
              font-size: 14px;
            }
            
            .qr-code-wrapper {
              background-color: #ffffff;
              border: 3px solid #10B981;
              border-radius: 12px;
              padding: 15px;
              margin: 20px auto;
              display: inline-block;
              box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2);
            }
            
            /* ✅ Enhanced QR Code image styles */
            .qr-code-image {
              width: 280px !important;
              height: 280px !important;
              display: block !important;
              margin: 0 auto !important;
              border: none !important;
              max-width: 280px !important;
              max-height: 280px !important;
            }
            
            .ticket-info-box {
              background-color: #f0f9ff;
              border: 1px solid #0ea5e9;
              border-radius: 8px;
              padding: 15px;
              margin: 15px 0;
            }
            
            .price-display {
              background-color: #ecfdf5;
              border: 1px solid #10B981;
              border-radius: 6px;
              padding: 12px;
              font-family: 'Courier New', monospace;
              font-size: 16px;
              font-weight: bold;
              color: #065f46;
              margin: 10px 0;
            }
            
            .usage-tip {
              background-color: #fef3c7;
              border-radius: 6px;
              padding: 10px;
              margin-top: 15px;
              font-size: 14px;
              color: #92400e;
            }
            
            .instructions-box {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 20px;
              margin: 20px 0;
              border-radius: 0 8px 8px 0;
            }
            
            .cta-button {
              display: inline-block;
              background-color: #10B981;
              color: #ffffff !important;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            
            .info-box {
              background-color: #e5f3ff;
              border-left: 4px solid #3b82f6;
              padding: 20px;
              margin: 20px 0;
              border-radius: 0 8px 8px 0;
            }
            
            .footer-section {
              text-align: center;
              padding: 30px 20px;
              background-color: #f8f9fa;
              color: #666666;
              font-size: 12px;
              line-height: 1.5;
            }
            
            @media only screen and (max-width: 600px) {
              .email-container {
                width: 100% !important;
              }
              .qr-code-image {
                width: 250px !important;
                height: 250px !important;
                max-width: 250px !important;
                max-height: 250px !important;
              }
            }
          </style>
        </head>
        <body>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td>
                <div class="email-container">
                  <!-- Header -->
                  <div class="header-section">
                    <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 10px 0;">🎉 ການຈອງໄດ້ຮັບການອະນຸມັດ!</h1>
                    <p style="font-size: 16px; margin: 0;">ລະບົບອອກປີ້ລົດຕູ້ໂດຍສານປະຈຳທາງ</p>
                  </div>
                  
                  <!-- Content -->
                  <div class="content-section">
                    <h2 style="font-size: 18px; margin-bottom: 20px;">ສະບາຍດີ ${booking.customer_name},</h2>
                    <p style="font-size: 16px; margin-bottom: 20px; color: #333333;">
                      ຂໍສະແດງຄວາມຍິນດີ! ການຈອງຂອງທ່ານໄດ້ຮັບການອະນຸມັດແລ້ວ 🎊
                    </p>
                    
                    <div class="highlight-box">
                      <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px;">✅ ສະຖານະການຈອງ: ອະນຸມັດແລ້ວ</h3>
                      <p style="margin: 0; color: #047857;">
                        ທ່ານສາມາດນຳ QR Code ຂ້າງລຸ່ມນີ້ໃຊ້ເດີນທາງໄດ້ໃນວັນທີ່ກຳນົດ
                      </p>
                    </div>

                    <!-- Booking Details Table -->
                    <table class="details-table" role="presentation">
                      <tr>
                        <td colspan="2" style="background-color: #f8f9fa; font-weight: bold; color: #374151; font-size: 16px;">
                          📋 ລາຍລະອຽດການຈອງ
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #666666; width: 40%;">ເລກທີ່ການຈອງ:</td>
                        <td style="font-weight: bold; color: #10B981; text-align: right;">${booking.booking_id}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666;">ຊື່ຜູ້ຈອງ:</td>
                        <td style="font-weight: bold; text-align: right;">${booking.customer_name}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666;">ເບີໂທລະສັບ:</td>
                        <td style="font-weight: bold; text-align: right;">${booking.customer_phone}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666;">ວັນທີ່ເດີນທາງ:</td>
                        <td style="font-weight: bold; color: #dc2626; text-align: right;">${new Date(booking.travel_date).toLocaleDateString('lo-LA')}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666;">ຈຳນວນຜູ້ໂດຍສານ:</td>
                        <td style="font-weight: bold; text-align: right;">${booking.passenger_count} ຄົນ</td>
                      </tr>
                      <tr>
                        <td style="color: #666666;">ປາຍທາງ:</td>
                        <td style="font-weight: bold; text-align: right;">${booking.destination}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666;">ລາຄາລວມ:</td>
                        <td style="font-weight: bold; color: #10B981; text-align: right;">₭${booking.total_price.toLocaleString()}</td>
                      </tr>
                    </table>

                    ${qrCodeBuffer ? `
                      <!-- ✅ QR Code Section with CID embedded image -->
                      <div class="qr-section">
                        <div class="qr-header">
                          📱 QR Code ສຳລັບເດີນທາງ
                        </div>
                        
                        <div class="qr-content">
                          <div class="ticket-badge">
                            ${ticketTypeDisplay}
                          </div>
                          
                          <div class="qr-code-wrapper">
                            <!-- ✅ Use CID reference for embedded attachment -->
                            <img src="cid:qrcode-${ticket.ticketNumber}" 
                                 alt="QR Code for ${ticket.ticketNumber}" 
                                 class="qr-code-image" />
                          </div>
                          
                          <div class="ticket-info-box">
                            <div style="font-size: 14px; color: #0ea5e9; margin-bottom: 8px;">
                              <strong>ເລກທີ່ປີ້:</strong> ${ticket.ticketNumber}
                            </div>
                            <div class="price-display">
                              ${priceInfo}
                            </div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
                              ${ticket.ticketType === 'group' ? 
                                `ປີ້ກຸ່ມ - ສຳລັບ ${ticket.passengerCount} ຄົນ` : 
                                'ປີ້ບຸກຄົນ - ສຳລັບ 1 ຄົນ'
                              }
                            </div>
                          </div>
                          
                          <div class="usage-tip">
                            <strong>📱 ວິທີໃຊ້:</strong><br>
                            ສະແກນ QR Code ນີ້ກັບຄົນຂັບກ່ອນຂຶ້ນລົດ
                          </div>
                        </div>
                      </div>
                    ` : `
                      <!-- QR Code Error State -->
                      <div class="qr-section">
                        <div class="qr-header">📱 QR Code ສຳລັບເດີນທາງ</div>
                        <div class="qr-content">
                          <div style="padding: 40px; color: #ef4444; font-weight: bold;">
                            ❌ ບໍ່ສາມາດສ້າງ QR Code ໄດ້<br>
                            ກະລຸນາຕິດຕໍ່ Admin ເພື່ອຂໍ QR Code<br>
                            <small style="color: #666666;">Ticket: ${ticket.ticketNumber}</small>
                          </div>
                        </div>
                      </div>
                    `}

                    <!-- Instructions -->
                    <div class="instructions-box">
                      <div style="color: #92400e; font-weight: bold; margin-bottom: 15px; font-size: 16px;">📝 ຄຳແນະນຳສຳລັບການເດີນທາງ</div>
                      <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                        <li style="margin-bottom: 8px;"><strong>ຢ່າລືມ QR Code:</strong> ເກັບ QR Code ນີ້ໄວ້ໃນໂທລະສັບ ຫຼື ພິມອອກມາ</li>
                        <li style="margin-bottom: 8px;"><strong>ໄປກ່ອນເວລາ:</strong> ມາເຖິງຈຸດຂຶ້ນລົດກ່ອນເວລາ 10-15 ນາທີ</li>
                        <li style="margin-bottom: 8px;"><strong>ສະແດງ QR Code:</strong> ໃຫ້ຄົນຂັບສະແກນ QR Code ກ່ອນຂຶ້ນລົດ</li>
                        <li style="margin-bottom: 8px;"><strong>ຕິດຕໍ່ກໍລະນີມີບັນຫາ:</strong> 020 XXXX XXXX</li>
                      </ul>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${process.env.NEXTAUTH_URL}/booking/status" class="cta-button">
                        🔍 ເຊັກສະຖານະການຈອງ
                      </a>
                    </div>

                    <!-- Additional Info -->
                    <div class="info-box">
                      <h4 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">💡 ຂໍ້ມູນເພີ່ມເຕີມ</h4>
                      <div style="color: #1e3a8a; font-size: 14px; line-height: 1.6;">
                        • ສາມາດເບິ່ງສະຖານະການຈອງໄດ້ຕະຫຼອດເວລາ<br>
                        • ຫາກມີການປ່ຽນແປງ ພວກເຮົາຈະແຈ້ງໃຫ້ທ່ານຮູ້<br>
                        • ຂໍຂອບໃຈທີ່ເລືອກໃຊ້ບໍລິການຂອງພວກເຮົາ
                      </div>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div class="footer-section">
                    <p style="margin: 0 0 5px 0; font-weight: bold;">🚌 ລະບົບອອກປີ້ລົດຕູ້ໂດຍສານປະຈຳທາງ</p>
                    <p style="margin: 0 0 5px 0;">ສະຖານີລົດໄຟຫຼວງພະບາງ</p>
                    <p style="margin: 15px 0 0 0; font-style: italic;">
                      ອີເມລນີ້ຖືກສົ່ງອັດຕະໂນມັດ ກະລຸນາຢ່າຕອບກັບ
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      
      // ✅ Add QR Code as embedded attachment with CID
      attachments: qrCodeBuffer ? [
        {
          filename: `qrcode-${ticket.ticketNumber}.png`,
          content: qrCodeBuffer,
          contentType: 'image/png',
          cid: `qrcode-${ticket.ticketNumber}`, // Content-ID for embedding
          contentDisposition: 'inline'
        }
      ] : []
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Enhanced approval email with QR attachment sent to:', booking.customer_email);
    
  } catch (emailError) {
    console.error('❌ Failed to send approval email:', emailError);
    throw new Error('Failed to send approval email: ' + (emailError as Error).message);
  }
}

// ✅ Updated main function to use attachment version
async function sendApprovalEmail(booking: any, ticket: any) {
  // Try attachment version first, fallback to inline if needed
  try {
    await sendApprovalEmailWithAttachment(booking, ticket);
  } catch (error) {
    console.warn('⚠️ Attachment method failed, trying inline fallback');
    // Fallback to previous inline method if attachment fails
    await sendApprovalEmailInline(booking, ticket);
  }
}



// Send rejection email
async function sendRejectionEmail(booking: any, rejectionReason?: string) {
  const transporter = createEmailTransporter();
  
  if (!transporter) {
    console.log('📧 Email transporter not available, skipping email');
    return;
  }
  
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@busticketsystem.com',
      to: booking.customer_email,
      subject: `❌ ການຈອງຖືກປະຕິເສດ - ${booking.booking_id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>ການຈອງຖືກປະຕິເສດ</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background: linear-gradient(135deg, #DC2626, #B91C1C); 
              color: white; 
              padding: 30px; 
              text-align: center; 
              border-radius: 12px 12px 0 0; 
            }
            .content { 
              background: #f8f9fa; 
              padding: 30px; 
              border-radius: 0 0 12px 12px; 
              border: 1px solid #e9ecef;
            }
            .booking-details { 
              background: white; 
              padding: 25px; 
              border-radius: 8px; 
              margin: 20px 0; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .detail-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 8px 0; 
              border-bottom: 1px solid #eee; 
            }
            .detail-row:last-child { 
              border-bottom: none; 
            }
            .rejection-reason { 
              background: #fee2e2; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #DC2626; 
              margin: 20px 0;
            }
            .next-steps { 
              background: #dbeafe; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #3b82f6; 
              margin: 20px 0;
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              color: #666; 
              font-size: 12px; 
            }
            .button {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>😔 ການຈອງຖືກປະຕິເສດ</h1>
            <p style="margin: 10px 0; font-size: 18px;">ລະບົບອອກປີ້ລົດຕູ້ໂດຍສານປະຈຳທາງ</p>
          </div>
          
          <div class="content">
            <h2>ສະບາຍດີ ${booking.customer_name},</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">
              ຂໍອະໄພທີ່ຕ້ອງແຈ້ງຂ່າວບໍ່ດີ ການຈອງຂອງທ່ານຖືກປະຕິເສດ
            </p>

            <div class="booking-details">
              <h3 style="color: #374151; margin-bottom: 15px;">📋 ລາຍລະອຽດການຈອງ</h3>
              <div class="detail-row">
                <span><strong>ເລກທີ່ການຈອງ:</strong></span>
                <span style="color: #DC2626; font-weight: bold;">${booking.booking_id}</span>
              </div>
              <div class="detail-row">
                <span>ວັນທີ່ເດີນທາງ:</span>
                <span>${new Date(booking.travel_date).toLocaleDateString('lo-LA')}</span>
              </div>
              <div class="detail-row">
                <span>ຈຳນວນຼູ້ໂດຍສານ:</span>
                <span>${booking.passenger_count} ຄົນ</span>
              </div>
              <div class="detail-row">
                <span>ລາຄາລວມ:</span>
                <span>₭${booking.total_price.toLocaleString()}</span>
              </div>
            </div>

            ${rejectionReason ? `
              <div class="rejection-reason">
                <h3 style="color: #991b1b; margin-bottom: 15px;">❌ ເຫດຜົນທີ່ຖືກປະຕິເສດ</h3>
                <p style="margin: 0; color: #7f1d1d; font-weight: 500;">
                  ${rejectionReason}
                </p>
              </div>
            ` : ''}

            <div class="next-steps">
              <h3 style="color: #1e40af; margin-bottom: 15px;">💡 ຂັ້ນຕອນຕໍ່ໄປ</h3>
              <ul style="margin: 0; padding-left: 20px; color: #1e3a8a;">
                <li style="margin-bottom: 8px;">ກວດສອບສະລິບການໂອນເງິນວ່າຊັດເຈນ ແລະ ຖືກຕ້ອງ</li>
                <li style="margin-bottom: 8px;">ກວດສອບວ່າຈຳນວນເງິນຖືກຕ້ອງ</li>
                <li style="margin-bottom: 8px;">ສາມາດຈອງໃໝ່ໄດ້ທັນທີ</li>
                <li style="margin-bottom: 8px;">ຕິດຕໍ່ Admin ຫາກມີຄຳຖາມ: 020 XXXX XXXX</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/booking" class="button">
                🎫 ຈອງໃໝ່
              </a>
            </div>
            
            <div class="footer">
              <p>🚌 ລະບົບອອກປີ້ລົດຕູ້ໂດຍສານປະຈຳທາງ</p>
              <p>ສະຖານີລົດໄຟຫຼວງພະບາງ</p>
              <p style="margin-top: 15px;">
                <em>ອີເມລນີ້ຖືກສົ່ງອັດຕະໂນມັດ ກະລຸນາຢ່າຕອບກັບ</em>
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Rejection email sent successfully to:', booking.customer_email);
    
  } catch (emailError) {
    console.error('❌ Failed to send rejection email:', emailError);
    throw new Error('Failed to send rejection email: ' + (emailError as Error).message);
  }
}

// GET - ดึงข้อมูลการจองแต่ละรายการ
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    console.log('📖 Getting booking with ID:', id);
    
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return NextResponse.json(
        { error: 'ບໍ່ພົບການຈອງ' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(booking);
    
  } catch (error) {
    console.error('Get Booking Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PUT - อัพเดทสถานะการจอง (สำหรับ admin) - Enhanced with Email Notifications
// Debug version - เพิ่ม logs เพื่อตรวจสอบปัญหา
// วางแทนส่วน PUT method ใน app/api/bookings/[id]/route.ts

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 [DEBUG] Starting booking update process...');
    
    // ตรวจสอบสิทธิ์ Admin/Staff
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'staff'].includes(session.user.role)) {
      console.log('❌ [DEBUG] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized - Admin/Staff only' },
        { status: 401 }
      );
    }
    
    await connectDB();
    
    const { id } = await params;
    console.log('📝 [DEBUG] Updating booking with ID:', id);
    
    const body = await request.json();
    const { action, notes } = body;
    
    console.log('📋 [DEBUG] Update request:', { action, notes, adminUser: session.user.email });
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
    
    const booking = await Booking.findById(id);
    
    if (!booking) {
      console.log('❌ [DEBUG] Booking not found:', id);
      return NextResponse.json(
        { error: 'ບໍ່ພົບການຈອງ' },
        { status: 404 }
      );
    }
    
    console.log('📊 [DEBUG] Current booking status:', {
      bookingId: booking.booking_id,
      currentStatus: booking.payment_status,
      customerName: booking.customer_name,
      customerEmail: booking.customer_email
    });
    
    if (booking.payment_status !== 'pending') {
      console.log('❌ [DEBUG] Booking already processed:', booking.payment_status);
      return NextResponse.json(
        { error: 'ການຈອງນີ້ຖືກດຳເນີນການແລ້ວ' },
        { status: 400 }
      );
    }
    
    let ticket = null;
    let emailSent = false;
    let emailError = null;
    
    if (action === 'approve') {
      console.log('✅ [DEBUG] Approving booking and creating ticket...');
      
      // อนุมัติการจอง
      booking.payment_status = 'approved';
      
      try {
        // สร้าง ticket ใหม่
        console.log('🎫 [DEBUG] Creating ticket...');
        
        const uniqueTicketNumber = await generateUniqueTicketNumber();
        
        const ticketData = {
          ticketNumber: uniqueTicketNumber,
          price: booking.total_price,
          paymentMethod: 'qr',
          soldBy: session.user.email || session.user.name || 'Booking System',
          soldAt: new Date(),
          ticketType: booking.passenger_count > 1 ? 'group' : 'individual',
          passengerCount: booking.passenger_count,
          pricePerPerson: booking.total_price / booking.passenger_count
        };
        
        console.log('🎫 [DEBUG] Creating ticket with data:', {
          ticketNumber: ticketData.ticketNumber,
          price: ticketData.price,
          ticketType: ticketData.ticketType,
          passengerCount: ticketData.passengerCount,
          pricePerPerson: ticketData.pricePerPerson
        });
        
        ticket = new Ticket(ticketData);
        await ticket.save();
        
        console.log('✅ [DEBUG] Ticket created successfully:', {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          price: ticket.price,
          passengerCount: ticket.passengerCount
        });
        
        // เชื่อมโยง ticket กับ booking
        booking.generated_ticket_id = ticket._id;
        
      } catch (ticketError) {
        console.error('❌ [DEBUG] Failed to create ticket:', ticketError);
        return NextResponse.json(
          { error: 'ເກີດຂໍ້ຜິດພາດໃນການສ້າງຕັ້ວ: ' + (ticketError as Error).message },
          { status: 500 }
        );
      }
      
      // ส่งอีเมลอนุมัติพร้อม QR Code
      console.log('📧 [DEBUG] Checking email configuration...');
      console.log('📧 [DEBUG] SMTP_HOST:', process.env.SMTP_HOST);
      console.log('📧 [DEBUG] SMTP_USER:', process.env.SMTP_USER);
      console.log('📧 [DEBUG] SMTP_FROM:', process.env.SMTP_FROM);
      console.log('📧 [DEBUG] Has SMTP_PASS:', !!process.env.SMTP_PASS);
      
      try {
        console.log('📧 [DEBUG] Attempting to send approval email...');
        await sendApprovalEmail(booking, ticket);
        emailSent = true;
        console.log('✅ [DEBUG] Approval email sent successfully');
      } catch (emailError: any) {
        console.error('⚠️ [DEBUG] Failed to send approval email:', emailError);
        emailError = emailError.message;
        // ไม่ให้ error นี้ทำให้การอัพเดทล้มเหลว
      }
      
    } else if (action === 'reject') {
      console.log('❌ [DEBUG] Rejecting booking...');
      
      // ปฏิเสธการจอง
      booking.payment_status = 'rejected';
      
      // ส่งอีเมลปฏิเสธ
      try {
        console.log('📧 [DEBUG] Attempting to send rejection email...');
        await sendRejectionEmail(booking, notes);
        emailSent = true;
        console.log('✅ [DEBUG] Rejection email sent successfully');
      } catch (emailError: any) {
        console.error('⚠️ [DEBUG] Failed to send rejection email:', emailError);
        emailError = emailError.message;
        // ไม่ให้ error นี้ทำให้การอัพเดทล้มเหลว
      }
    }
    
    // เพิ่มหมายเหตุถ้ามี
    if (notes) {
      booking.notes = notes;
      console.log('📝 [DEBUG] Added notes:', notes);
    }
    
    // บันทึกการเปลี่ยนแปลง
    await booking.save();
    
    console.log('💾 [DEBUG] Booking updated successfully:', {
      bookingId: booking.booking_id,
      newStatus: booking.payment_status,
      hasTicket: !!booking.generated_ticket_id,
      emailSent: emailSent,
      emailError: emailError
    });
    
    return NextResponse.json({
      success: true,
      booking: {
        _id: booking._id,
        booking_id: booking.booking_id,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        payment_status: booking.payment_status,
        notes: booking.notes,
        generated_ticket_id: booking.generated_ticket_id
      },
      ticket: ticket ? {
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        ticketType: ticket.ticketType,
        passengerCount: ticket.passengerCount,
        price: ticket.price
      } : null,
      emailSent: emailSent,
      emailError: emailError,
      debug: {
        smtpConfigured: !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS,
        smtpHost: process.env.SMTP_HOST,
        smtpUser: process.env.SMTP_USER,
        hasSmtpPass: !!process.env.SMTP_PASS
      },
      message: action === 'approve' 
        ? `ອະນຸມັດການຈອງສຳເລັດ${emailSent ? ' ແລະສົ່ງອີເມລແລ້ວ' : ` (อีเมลไม่ส่ง: ${emailError})`}` 
        : `ປະຕິເສດການຈອງແລ້ວ${emailSent ? ' ແລະສົ່ງອີເມລແລ້ວ' : ` (อีเมลไม่ส่ง: ${emailError})`}`
    });
    
  } catch (error) {
    console.error('💥 [DEBUG] Update Booking Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : null
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to update booking',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - ยกเลิกการจอง (ด้วย JWT token)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    console.log('🗑️ Cancelling booking with ID:', id);
    
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as any;
      
      if (decoded.type !== 'booking_status') {
        return NextResponse.json(
          { error: 'Invalid token type' },
          { status: 401 }
        );
      }
      
      const booking = await Booking.findById(id);
      
      if (!booking) {
        return NextResponse.json(
          { error: 'ບໍ່ພົບການຈອງ' },
          { status: 404 }
        );
      }
      
      // Verify ownership
      if (booking.customer_phone !== decoded.phone || booking._id.toString() !== decoded.bookingId) {
        return NextResponse.json(
          { error: 'ບໍ່ມີສິດຍົກເລີກການຈອງນີ້' },
          { status: 403 }
        );
      }
      
      // Check if can still be cancelled
      if (!booking.canBeCancelled()) {
        return NextResponse.json(
          { error: 'ໝົດເວລາຍົກເລີກການຈອງແລ້ວ (10 ຊົ່ວໂມງ)' },
          { status: 400 }
        );
      }
      
      // Cancel booking
      booking.booking_status = 'cancelled';
      await booking.save();
      
      console.log('✅ Booking cancelled successfully:', booking.booking_id);
      
      return NextResponse.json({
        success: true,
        message: 'ຍົກເລີກການຈອງສຳເລັດແລ້ວ'
      });
      
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return NextResponse.json(
        { error: 'ລິ້ງໝົດອາຍຸ ຫຼື ບໍ່ຖືກຕ້ອງ' },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Cancel Booking Error:', error);
    return NextResponse.json(
      { error: 'ເກີດຂໍ້ຜິດພາດໃນການຍົກເລີກ' },
      { status: 500 }
    );
  }
}

// Helper function สำหรับสร้าง unique ticket number
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateUUIDTicketNumber(): string {
  let result = 'T';
  
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_CHARS.length);
    result += SAFE_CHARS[randomIndex];
  }
  
  return result;
}

async function generateUniqueTicketNumber(): Promise<string> {
  const maxAttempts = 20;
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    attempt++;
    
    const candidateNumber = generateUUIDTicketNumber();
    
    console.log(`🎲 Generated ticket candidate: ${candidateNumber} (attempt ${attempt})`);
    
    const existingTicket = await Ticket.findOne({ ticketNumber: candidateNumber });
    
    if (!existingTicket) {
      console.log(`✅ Unique ticket number found: ${candidateNumber}`);
      return candidateNumber;
    }
    
    console.log(`⚠️ ${candidateNumber} already exists, trying again...`);
  }
  
  // Emergency fallback
  const timestamp = Date.now().toString().slice(-2);
  const emergency = `T${SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]}${timestamp}${SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]}${SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]}`;
  
  console.log(`🆘 Using emergency ticket number: ${emergency}`);
  return emergency;
}