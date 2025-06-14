// app/dashboard/reports/utils/exportUtils.ts - อัพเดทให้รองรับรายงานทุกประเภท

// ===== TYPE DEFINITIONS =====
interface Period {
  startDate: string;
  endDate: string;
}

interface QuickStats {
  totalTickets?: number;
  totalRevenue?: number;
  totalPassengers?: number;
  activeDrivers?: number;
  avgTicketPrice?: number;
  avgPricePerPassenger?: number;
  groupTicketPercentage?: number;
  individualTicketPercentage?: number;
}

interface TicketBreakdown {
  individual?: {
    count: number;
    revenue: number;
    passengers: number;
    percentage: number;
  };
  group?: {
    count: number;
    revenue: number;
    passengers: number;
    percentage: number;
    averageGroupSize: number;
  };
}

interface PaymentMethod {
  _id: string;
  count: number;
  revenue: number;
}

interface SummaryData {
  totalTickets?: number;
  totalRevenue?: number;
  totalPassengers?: number;
  averagePrice?: number;
  averagePricePerPassenger?: number;
  ticketBreakdown?: TicketBreakdown;
  [key: string]: any;
}

interface ReportData {
  period: Period;
  quickStats?: QuickStats;
  summary?: SummaryData;
  sales?: SummaryData;
  paymentMethods?: PaymentMethod[];
  drivers?: any[];
  breakdown?: any;
  metadata?: any;
  carTypes?: any[];
  cars?: any[];
  staff?: any[];
  [key: string]: any;
}

type ReportType = 'summary' | 'sales' | 'drivers' | 'financial' | 'vehicles' | 'staff';

// ===== HELPER FUNCTIONS =====
const formatDate = (dateStr: string): string => new Date(dateStr).toLocaleDateString('lo-LA');
const formatCurrency = (amount: number): string => `₭${amount.toLocaleString()}`;

const getReportTypeName = (type: ReportType): string => {
  const titles: Record<ReportType, string> = {
    'summary': 'ສະຫຼຸບລວມ',
    'sales': 'ລາຍງານຍອດຂາຍ',
    'drivers': 'ລາຍງານພະນັກງານຂັບລົດ',
    'financial': 'ລາຍງານການເງິນ',
    'vehicles': 'ລາຍງານຂໍ້ມູນລົດ',
    'staff': 'ລາຍງານພະນັກງານຂາຍປີ້'
  };
  return titles[type];
};

// ===== MAIN EXPORT FUNCTIONS =====
export const exportToPDF = async (reportData: ReportData, reportType: ReportType): Promise<void> => {
  try {
    // Import jsPDF และ html2canvas
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    // สร้างเนื้อหา HTML สำหรับ PDF
    const htmlContent = generatePDFContent(reportData, reportType);
    
    // สร้าง element ชั่วคราวสำหรับ render
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '794px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.padding = '40px';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    
    document.body.appendChild(tempDiv);

    // รอให้ fonts โหลดเสร็จ
    await document.fonts.ready;

    // แปลงเป็น canvas
    const canvas = await html2canvas(tempDiv, {
      useCORS: true,
      allowTaint: true,
      background: '#ffffff',
      width: 794,
      height: tempDiv.scrollHeight + 80
    });

    // สร้าง PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    // เพิ่มหน้าแรก
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // เพิ่มหน้าถัดไป
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // ตั้งชื่อไฟล์และดาวน์โหลด
    const today = new Date();
    const dateStr = today.toLocaleDateString('lo-LA').replace(/\//g, '-');
    const reportTypeName = getReportTypeName(reportType);
    const fileName = `${reportTypeName}_${dateStr}.pdf`;

    pdf.save(fileName);

    // ลบ element ชั่วคราว
    document.body.removeChild(tempDiv);
    
    console.log('PDF exported successfully:', fileName);

  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('ເກີດຂໍ້ຜິດພາດໃນການສົ່ງອອກ PDF');
  }
};

export const printReport = (reportData: ReportData, reportType: ReportType): void => {
  try {
    const htmlContent = generatePDFContent(reportData, reportType);
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (error) {
            console.error('Print error:', error);
          }
          
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 2000);
        }, 500);
      };
    }
  } catch (error) {
    console.error('Error printing report:', error);
    alert('ເກີດຂໍ້ຜິດພາດໃນການພິມລາຍງານ');
  }
};

// ===== PDF CONTENT GENERATION =====
const generatePDFContent = (reportData: ReportData, reportType: ReportType): string => {
  const styles = generatePDFStyles();
  const header = generatePDFHeader(reportType);
  const footer = generatePDFFooter();
  const periodInfo = generatePeriodInfo(reportData.period.startDate, reportData.period.endDate);
  const content = generateContentByType(reportData, reportType);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ລາຍງານ - ${getReportTypeName(reportType)}</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="report-container">
        ${header}
        ${periodInfo}
        ${content}
        ${footer}
      </div>
    </body>
    </html>
  `;
};

const generatePDFStyles = (): string => {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Noto Sans Lao', 'Arial', sans-serif;
      font-size: 14px; line-height: 1.6; color: #333;
      background: white; padding: 20px;
    }
    
    .report-container { max-width: 100%; margin: 0 auto; background: white; }
    
    .report-header {
      text-align: center; margin-bottom: 30px;
      border-bottom: 3px solid #2563EB; padding-bottom: 20px;
    }
    
    .report-title {
      font-size: 24px; font-weight: bold;
      margin-bottom: 8px; color: #2563EB;
    }
    
    .report-subtitle { font-size: 16px; color: #666; margin-bottom: 5px; }
    .system-name { font-size: 14px; color: #888; }
    
    .period-info {
      background: #f8f9fa; padding: 15px; margin: 20px 0;
      text-align: center; border-radius: 8px; border: 2px solid #e9ecef;
      font-size: 16px; font-weight: bold;
    }
    
    .content-section { margin: 20px 0; }
    
    .section-title {
      font-size: 18px; font-weight: bold; margin-bottom: 15px;
      color: #333; border-bottom: 2px solid #ddd; padding-bottom: 8px;
    }
    
    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px; margin: 15px 0;
    }
    
    .stat-card {
      background: #f8f9fa; border: 2px solid #e9ecef;
      border-radius: 8px; padding: 15px; text-align: center;
    }
    
    .stat-label {
      font-size: 12px; color: #666; margin-bottom: 5px; font-weight: bold;
    }
    
    .stat-value { font-size: 18px; font-weight: bold; color: #2563EB; }
    
    table {
      width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px;
    }
    
    table th, table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    
    table th {
      background: #f1f3f4; font-weight: bold; font-size: 13px; color: #333;
    }
    
    .table-highlight { background: #e3f2fd !important; font-weight: bold; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .currency { font-weight: bold; color: #2563EB; }
    .text-success { color: #28a745; }
    .text-danger { color: #dc3545; }
    
    .report-footer {
      margin-top: 30px; text-align: center; font-size: 12px; color: #666;
      border-top: 2px solid #ddd; padding-top: 15px;
    }
    
    .no-break { page-break-inside: avoid; }
    .revenue-box {
      background: linear-gradient(135deg, #e8f5e8 0%, #e3f2fd 100%);
      border: 2px solid #4caf50; border-radius: 8px; padding: 20px; margin: 20px 0;
    }
  `;
};

const generatePDFHeader = (reportType: ReportType): string => {
  return `
    <div class="report-header">
      <div class="report-title">${getReportTypeName(reportType)}</div>
      <div class="report-subtitle">ລະບົບອອກປີ້ລົດຕູ້ໂດຍສານປະຈຳ</div>
      <div class="system-name">ສະຖານີລົດໄຟຫຼວງພະບາງ</div>
    </div>
  `;
};

const generatePDFFooter = (): string => {
  return `
    <div class="report-footer">
      <p><strong>ສ້າງເມື່ອ:</strong> ${new Date().toLocaleString('lo-LA')}</p>
      <p>🚌 ລະບົບອອກປີ້ລົດຕູ້ໂດຍສານປະຈຳສະຖານີລົດໄຟຫຼວງພະບາງ</p>
    </div>
  `;
};

const generatePeriodInfo = (startDate: string, endDate: string): string => {
  return `
    <div class="period-info">
      📅 <strong>ໄລຍະເວລາ:</strong> ${formatDate(startDate)} - ${formatDate(endDate)}
    </div>
  `;
};

const generateContentByType = (reportData: ReportData, reportType: ReportType): string => {
  switch (reportType) {
    case 'summary':
      return generateSummaryContent(reportData);
    case 'sales':
      return generateSalesContent(reportData);
    case 'drivers':
      return generateDriversContent(reportData);
    case 'financial':
      return generateFinancialContent(reportData);
    case 'vehicles':
      return generateVehiclesContent(reportData);
    case 'staff':
      return generateStaffContent(reportData);
    default:
      return '<div class="content-section">ບໍ່ມີຂໍ້ມູນ</div>';
  }
};

// ===== CONTENT GENERATORS =====
const generateSummaryContent = (reportData: ReportData): string => {
  const stats = reportData.quickStats || {};
  const sales = reportData.sales || {};
  const ticketBreakdown = sales.ticketBreakdown || {};
  
  return `
    <div class="content-section">
      <div class="section-title">📊 ສະຫຼຸບລວມ</div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">🎫 ປີ້ທີ່ຂາຍ</div>
          <div class="stat-value">${stats.totalTickets || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">👥 ຜູ້ໂດຍສານລວມ</div>
          <div class="stat-value">${stats.totalPassengers || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💰 ລາຍຮັບລວມ</div>
          <div class="stat-value currency">${formatCurrency(stats.totalRevenue || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">👨‍✈️ ພະນັກງານຂັບລົດເຂົ້າວຽກ</div>
          <div class="stat-value">${stats.activeDrivers || 0}</div>
        </div>
      </div>
      
      <div class="section-title" style="margin-top: 30px;">🎫 ລາຍລະອຽດປີ້ແຍກປະເພດ</div>
      <table class="no-break">
        <tr class="table-highlight">
          <th>ປະເພດປີ້</th>
          <th class="text-center">ຈຳນວນໃບ</th>
          <th class="text-center">ຜູ້ໂດຍສານ</th>
          <th class="text-center">ລາຍຮັບ</th>
          <th class="text-center">ສັດສ່ວນ</th>
        </tr>
        <tr>
          <td><strong>👤 ປີ້ບຸກຄົນ</strong></td>
          <td class="text-center">${ticketBreakdown.individual?.count || 0}</td>
          <td class="text-center">${ticketBreakdown.individual?.passengers || 0}</td>
          <td class="text-center currency">${formatCurrency(ticketBreakdown.individual?.revenue || 0)}</td>
          <td class="text-center"><strong>${ticketBreakdown.individual?.percentage || 0}%</strong></td>
        </tr>
        <tr>
          <td><strong>👥 ປີ້ກະລຸ່ມ</strong></td>
          <td class="text-center">${ticketBreakdown.group?.count || 0}</td>
          <td class="text-center">${ticketBreakdown.group?.passengers || 0}</td>
          <td class="text-center currency">${formatCurrency(ticketBreakdown.group?.revenue || 0)}</td>
          <td class="text-center"><strong>${ticketBreakdown.group?.percentage || 0}%</strong></td>
        </tr>
        <tr style="background: #f8f9fa; font-weight: bold;">
          <td><strong>📊 ລວມທັງໝົດ</strong></td>
          <td class="text-center">${stats.totalTickets || 0}</td>
          <td class="text-center">${stats.totalPassengers || 0}</td>
          <td class="text-center currency">${formatCurrency(stats.totalRevenue || 0)}</td>
          <td class="text-center">100%</td>
        </tr>
      </table>
    </div>
  `;
};

const generateSalesContent = (reportData: ReportData): string => {
  const summary = reportData.summary || {};
  let paymentTable = '';
  
  if (reportData.paymentMethods && reportData.paymentMethods.length > 0) {
    const paymentRows = reportData.paymentMethods.map((pm: PaymentMethod) => `
      <tr>
        <td><strong>${pm._id === 'cash' ? '💵 ເງິນສົດ' : '📱 ເງິນໂອນ'}</strong></td>
        <td class="text-center">${pm.count}</td>
        <td class="text-right currency">${formatCurrency(pm.revenue)}</td>
        <td class="text-center">${summary.totalTickets ? Math.round((pm.count / summary.totalTickets) * 100) : 0}%</td>
      </tr>
    `).join('');
    
    paymentTable = `
      <table class="no-break">
        <tr class="table-highlight">
          <th>ວິທີຊຳລະ</th>
          <th class="text-center">ຈຳນວນ</th>
          <th class="text-center">ລາຍຮັບ</th>
          <th class="text-center">ສັດສ່ວນ</th>
        </tr>
        ${paymentRows}
      </table>
    `;
  }
  
  return `
    <div class="content-section">
      <div class="section-title">🎯 ລາຍງານຍອດຂາຍ</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">🎫 ປີ້ທີ່ຂາຍ</div>
          <div class="stat-value">${summary.totalTickets || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💰 ລາຍຮັບລວມ</div>
          <div class="stat-value currency">${formatCurrency(summary.totalRevenue || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📈 ລາຄາເຊລີ່ຍ</div>
          <div class="stat-value currency">${formatCurrency(summary.averagePrice || 0)}</div>
        </div>
      </div>
      ${paymentTable || '<p style="text-align: center; color: #666;">ບໍ່ມີຂໍ້ມູນການຊຳລະເງິນ</p>'}
    </div>
  `;
};

const generateDriversContent = (reportData: ReportData): string => {
  const summary = reportData.summary || {};
  const metadata = reportData.metadata || {};
  const drivers = reportData.drivers || [];
  
  const qualifiedDrivers = drivers.filter((d: any) => (d.totalIncome || 0) > 0);
  const nonQualifiedDrivers = drivers.filter((d: any) => (d.totalIncome || 0) === 0);
  
  let qualifiedTable = '';
  if (qualifiedDrivers.length > 0) {
    const qualifiedRows = qualifiedDrivers.slice(0, 15).map((driver: any, index: number) => `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td><strong>${driver.name || 'ບໍ່ລະບຸ'}</strong></td>
        <td class="text-center">${driver.employeeId || '-'}</td>
        <td class="text-center">${driver.workDays || 0}</td>
        <td class="text-right currency">${formatCurrency(driver.totalIncome || 0)}</td>
        <td class="text-center text-success">ມີສິທິ່ຮັບລາຍຮັບ</td>
      </tr>
    `).join('');
    
    qualifiedTable = `
      <h3 style="color: #2e7d32; margin: 20px 0 10px 0;">✅ ພະນັກງານຂັບລົດທີ່ມີສິທິ່ຮັບລາຍຮັບ (${qualifiedDrivers.length} ຄົນ)</h3>
      <table>
        <tr class="table-highlight">
          <th class="text-center">#</th>
          <th>ຊື່</th>
          <th class="text-center">ລະຫັດ</th>
          <th class="text-center">ວັນທຳງານ</th>
          <th class="text-center">ລາຍຮັບ</th>
          <th class="text-center">ສິທິ່</th>
        </tr>
        ${qualifiedRows}
      </table>
    `;
  }
  
  return `
    <div class="content-section">
      <div class="section-title">👥 ລາຍງານພະນັກງານຂັບລົດ</div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">👥 ພະນັກງານຂັບລົດທັງໝົດ</div>
          <div class="stat-value">${summary.totalDrivers || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">🎯 ທີ່ມີສິທິ່ຮັບລາຍຮັບ</div>
          <div class="stat-value">${qualifiedDrivers.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💰 ລາຍຮັບເຊລີ່ຍຕໍ່ຄົນ</div>
          <div class="stat-value currency">${formatCurrency(metadata.revenuePerDriver || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💵 ລາຍຮັບລວມ</div>
          <div class="stat-value currency">${formatCurrency(summary.totalIncome || 0)}</div>
        </div>
      </div>
      
      <div class="revenue-box">
        <h3 style="color: #2e7d32; margin-bottom: 15px;">💰 ສະຫຼຸບລາຍຮັບພະນັກງານຂັບລົດ</h3>
        <table style="border: none;">
          <tr>
            <td style="text-align: center; background: white; border-radius: 8px; padding: 15px;">
              <div style="font-size: 24px; font-weight: bold; color: #2e7d32;">${formatCurrency(summary.totalIncome || 0)}</div>
              <div style="font-size: 12px; color: #666;">ລາຍຮັບລວມ (85%)</div>
            </td>
            <td style="text-align: center; background: white; border-radius: 8px; padding: 15px;">
              <div style="font-size: 24px; font-weight: bold; color: #1976d2;">${qualifiedDrivers.length}</div>
              <div style="font-size: 12px; color: #666;">ທຳຄົບ 2 ຮອບ</div>
            </td>
            <td style="text-align: center; background: white; border-radius: 8px; padding: 15px;">
              <div style="font-size: 24px; font-weight: bold; color: #7b1fa2;">${formatCurrency(metadata.revenuePerDriver || 0)}</div>
              <div style="font-size: 12px; color: #666;">ລາຍຮັບເຊລີ່ຍຕໍ່ຄົນ</div>
            </td>
          </tr>
        </table>
      </div>
      
      ${qualifiedTable}
    </div>
  `;
};

const generateFinancialContent = (reportData: ReportData): string => {
  const breakdown = reportData.breakdown || {};
  
  return `
    <div class="content-section">
      <div class="section-title">💼 ລາຍງານການເງິນ</div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">💰 ລາຍຮັບລວມ</div>
          <div class="stat-value currency">${formatCurrency(reportData.summary?.totalRevenue || 0)}</div>
        </div>
      </div>
      
      <table class="no-break">
        <tr class="table-highlight">
          <th>ປະເພດ</th>
          <th class="text-center">ມູນຄ່າ</th>
          <th class="text-center">ເປີເຊັນ</th>
          <th class="text-center">ລາຍການ</th>
        </tr>
        <tr>
          <td><strong>🏢 ບໍລິສັດ</strong></td>
          <td class="text-right currency">${formatCurrency(breakdown.company?.totalAmount || 0)}</td>
          <td class="text-center"><strong>10%</strong></td>
          <td class="text-center">${breakdown.company?.transactionCount || 0} ລາຍການ</td>
        </tr>
        <tr>
          <td><strong>🚉 ສະຖານີ</strong></td>
          <td class="text-right currency">${formatCurrency(breakdown.station?.totalAmount || 0)}</td>
          <td class="text-center"><strong>5%</strong></td>
          <td class="text-center">${breakdown.station?.transactionCount || 0} ລາຍການ</td>
        </tr>
        <tr>
          <td><strong>👥 ພະນັກງານຂັບລົດ</strong></td>
          <td class="text-right currency">${formatCurrency(breakdown.driver?.totalAmount || 0)}</td>
          <td class="text-center"><strong>85%</strong></td>
          <td class="text-center">${breakdown.driver?.transactionCount || 0} ລາຍການ</td>
        </tr>
      </table>
    </div>
  `;
};

const generateVehiclesContent = (reportData: ReportData): string => {
  const summary = reportData.summary || {};
  const carTypes = reportData.carTypes || [];
  const cars = reportData.cars || [];
  
  let carTypesTable = '';
  if (carTypes.length > 0) {
    const carTypeRows = carTypes.map((type: any) => `
      <tr>
        <td><strong>${type.carType_name}</strong></td>
        <td class="text-center">${type.count}</td>
        <td class="text-center">${summary.totalCars ? Math.round((type.count / summary.totalCars) * 100) : 0}%</td>
        <td class="text-center text-success">${type.activeCars || 0}</td>
        <td class="text-center text-danger">${type.count - (type.activeCars || 0)}</td>
      </tr>
    `).join('');
    
    carTypesTable = `
      <table class="no-break">
        <tr class="table-highlight">
          <th>ປະເພດລົດ</th>
          <th class="text-center">ຈຳນວນ</th>
          <th class="text-center">ສັດສ່ວນ</th>
          <th class="text-center">ກຳລັງໃຊ້</th>
          <th class="text-center">ບໍ່ໃຊ້</th>
        </tr>
        ${carTypeRows}
      </table>
    `;
  }

  return `
    <div class="content-section">
      <div class="section-title">🚗 ລາຍງານຂໍ້ມູນລົດ</div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">🚛 ລົດທັງໝົດ</div>
          <div class="stat-value">${summary.totalCars || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">✅ ລົດກຳລັງໃຊ້</div>
          <div class="stat-value">${summary.activeCars || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">🏷️ ປະເພດລົດ</div>
          <div class="stat-value">${summary.totalCarTypes || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">👨‍✈️ ພະນັກງານຂັບລົດທີ່ມີລົດ</div>
          <div class="stat-value">${summary.driversWithCars || 0}</div>
        </div>
      </div>
      
      <div class="section-title">📋 ລາຍລະອຽດປະເພດລົດ</div>
      ${carTypesTable || '<p style="text-align: center; color: #666;">ບໍ່ມີຂໍ້ມູນປະເພດລົດ</p>'}
    </div>
  `;
};

const generateStaffContent = (reportData: ReportData): string => {
  const summary = reportData.summary || {};
  const staff = reportData.staff || [];
  
  let staffTable = '';
  if (staff.length > 0) {
    const activeStaff = staff.filter((s: any) => (s.ticketsSold || 0) > 0 || s.checkInStatus === 'checked-in').slice(0, 15);
    
    if (activeStaff.length > 0) {
      const staffRows = activeStaff.map((member: any, index: number) => `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td><strong>${member.name || 'ບໍ່ລະບຸ'}</strong></td>
          <td class="text-center">${member.employeeId || '-'}</td>
          <td class="text-center">
            <span class="${member.checkInStatus === 'checked-in' ? 'text-success' : 'text-danger'}">
              ${member.checkInStatus === 'checked-in' ? 'ເຂົ້າວຽກ' : 'ອອກວຽກ'}
            </span>
          </td>
          <td class="text-center currency">${member.ticketsSold || 0}</td>
          <td class="text-center"><strong>${member.workDays || 0} ວັນ</strong></td>
        </tr>
      `).join('');
      
      staffTable = `
        <table>
          <tr class="table-highlight">
            <th class="text-center">#</th>
            <th>ຊື່</th>
            <th class="text-center">ລະຫັດ</th>
            <th class="text-center">ສະຖານະ</th>
            <th class="text-center">ປີ້ທີ່ຂາຍ</th>
            <th class="text-center">ວັນທຳງານ</th>
          </tr>
          ${staffRows}
        </table>
      `;
    }
  }
  
  return `
    <div class="content-section">
      <div class="section-title">👥 ລາຍງານພະນັກງານຂາຍປີ້</div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">👥 ພະນັກງານທັງໝົດ</div>
          <div class="stat-value">${summary.totalStaff || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">✅ ເຂົ້າວຽກ</div>
          <div class="stat-value">${summary.activeStaff || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">🎫 ປີ້ທີ່ຂາຍລວມ</div>
          <div class="stat-value">${summary.totalTicketsSold || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📅 ວັນທຳງານລວມ</div>
          <div class="stat-value">${summary.totalWorkDays || 0} ວັນ</div>
        </div>
      </div>
      
      <div class="section-title">👤 ລາຍລະອຽດການປະຕິບັດງານພະນັກງານ</div>
      ${staffTable || '<p style="text-align: center; color: #666;">ບໍ່ມີຂໍ້ມູນພະນັກງານທີ່ເຂົ້າວຽກໃນຊ່ວງນີ້</p>'}
    </div>
  `;
};