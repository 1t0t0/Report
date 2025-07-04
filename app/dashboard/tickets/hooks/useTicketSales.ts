// app/dashboard/tickets/hooks/useTicketSales.ts - FIXED with Multiple Refresh Strategies
import { useState, useCallback, useEffect } from 'react';
import { createTicket } from '../api/ticket';
import { PAYMENT_METHODS } from '../config/constants';
import { Ticket } from '../types';
import notificationService from '@/lib/notificationService';

interface CarRefreshCallback {
  (): void;
}

export default function useTicketSales() {
  // State
  const [ticketPrice, setTicketPrice] = useState(45000);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>(PAYMENT_METHODS.CASH);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(true);
  
  const [createdTickets, setCreatedTickets] = useState<Ticket[]>([]);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [ticketType, setTicketType] = useState<'individual' | 'group'>('individual');
  const [destination, setDestination] = useState('');
  
  // Car Selection State
  const [selectedCarRegistration, setSelectedCarRegistration] = useState('');
  
  // ✅ Car refresh callback state
  const [carRefreshCallback, setCarRefreshCallback] = useState<CarRefreshCallback | null>(null);
  
  // ฟังก์ชันดึงราคาปี้จาก API
  const fetchTicketPrice = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/ticket-price');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && typeof data.ticketPrice === 'number') {
        setTicketPrice(data.ticketPrice);
        console.log('✅ Ticket price loaded:', data.ticketPrice);
      } else {
        console.warn('⚠️ Failed to fetch ticket price, using default');
        setTicketPrice(45000);
      }
    } catch (error) {
      console.warn('⚠️ Error fetching ticket price, using default:', error);
      setTicketPrice(45000);
    } finally {
      setPriceLoading(false);
    }
  }, []);
  
  // ดึงราคาเมื่อ component โหลด
  useEffect(() => {
    fetchTicketPrice();
  }, [fetchTicketPrice]);

  // Helper functions
  const formatDateShort = (date: Date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  const formatTimeShort = (date: Date) => {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'ເງິນສົດ/CASH';
      case 'qr': return 'QR/ໂອນ';
      default: return method;
    }
  };

  const getDestinationText = () => {
    return destination.trim() || 'ຕົວເມືອງ';
  };

  const generateQRCodeData = (ticket: Ticket) => {
    if (ticket.ticketType === 'group') {
      return JSON.stringify({
        ticketNumber: ticket.ticketNumber,
        ticketType: 'group',
        passengerCount: ticket.passengerCount,
        totalPrice: ticket.price,
        pricePerPerson: ticket.pricePerPerson,
        destination: ticket.destination,
        soldAt: ticket.soldAt,
        paymentMethod: ticket.paymentMethod,
        soldBy: ticket.soldBy,
        forDriverOnly: true,
        validationKey: `GRP-${ticket.ticketNumber}-${new Date(ticket.soldAt).getTime()}`
      });
    } else {
      return ticket.ticketNumber;
    }
  };

  const generateQRCodeSVG = async (data: string) => {
    try {
      const QRCode = await import('qrcode');
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        width: 200,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  };
  
  // Modal functions
  const showConfirmation = useCallback(() => {
    setShowConfirmModal(true);
  }, []);

  const cancelConfirmation = useCallback(() => {
    setShowConfirmModal(false);
    setQuantity(ticketType === 'group' ? 2 : 1);
    setDestination('');
    setSelectedCarRegistration('');
  }, [ticketType]);

  const updateQuantity = useCallback((newQuantity: number) => {
    setQuantity(newQuantity);
  }, []);

  const updateTicketType = useCallback((type: 'individual' | 'group') => {
    setTicketType(type);
    if (type === 'group' && quantity < 2) {
      setQuantity(2);
    } else if (type === 'individual' && quantity > 50) {
      setQuantity(1);
    }
  }, [quantity]);

  const updateDestination = useCallback((newDestination: string) => {
    setDestination(newDestination);
  }, []);

  // Car Selection Functions
  const updateSelectedCar = useCallback((carRegistration: string) => {
    setSelectedCarRegistration(carRegistration);
    console.log('✅ Car selected for ticket assignment:', carRegistration);
  }, []);

  // ✅ เพิ่มฟังก์ชันสำหรับ register car refresh callback
  const registerCarRefreshCallback = useCallback((callback: CarRefreshCallback) => {
    setCarRefreshCallback(() => callback);
  }, []);

  // รีเฟรชราคา
  const refreshTicketPrice = useCallback(() => {
    setPriceLoading(true);
    return fetchTicketPrice();
  }, [fetchTicketPrice]);

  // ✅ CRITICAL FIX: Enhanced confirmSellTicket with immediate refresh strategies
  const confirmSellTicket = useCallback(async () => {
    // ตรวจสอบการเลือกรถ
    if (!selectedCarRegistration) {
      notificationService.error('❌ ກະລຸນາເລືອກລົດກ່ອນ');
      return;
    }

    console.log('🎯 Starting ticket sale with car:', selectedCarRegistration);

    setLoading(true);
    try {
      let tickets: Ticket[] = [];
      
      if (ticketType === 'group') {
        // เพิ่ม selectedCarRegistration ใน request
        const groupTicketData = {
          price: ticketPrice * quantity,
          paymentMethod,
          ticketType: 'group' as const,
          passengerCount: quantity,
          pricePerPerson: ticketPrice,
          destination: getDestinationText(),
          selectedCarRegistration: selectedCarRegistration
        };
        
        console.log('📋 Creating group ticket:', groupTicketData);
        
        const groupTicket = await createTicket(groupTicketData);
        tickets.push(groupTicket);
        
        notificationService.success(`✅ ອອກປີ້ກຸ່ມສຳເລັດ: ${quantity} ຄົນ ລົດ ${selectedCarRegistration} (₭${(ticketPrice * quantity).toLocaleString()})`);
      } else {
        for (let i = 0; i < quantity; i++) {
          // เพิ่ม selectedCarRegistration ใน request
          const individualTicketData = {
            price: ticketPrice,
            paymentMethod,
            ticketType: 'individual' as const,
            passengerCount: 1,
            pricePerPerson: ticketPrice,
            destination: getDestinationText(),
            selectedCarRegistration: selectedCarRegistration
          };
          
          console.log(`📋 Creating individual ticket ${i + 1}:`, individualTicketData);
          
          const individualTicket = await createTicket(individualTicketData);
          tickets.push(individualTicket);
        }
        
        notificationService.success(`✅ ອອກປີ້ສຳເລັດ ${quantity} ໃບ ລົດ ${selectedCarRegistration} (₭${(ticketPrice * quantity).toLocaleString()})`);
      }
      
      // Log created tickets for debugging
      console.log('🎉 Created tickets:', tickets.map(t => ({
        ticketNumber: t.ticketNumber,
        assignedDriverId: t.assignedDriverId,
        assignmentInfo: t.assignmentInfo
      })));
      
      setCreatedTickets(Array.isArray(tickets) ? tickets : []);
      setShowConfirmModal(false);
      setQuantity(ticketType === 'group' ? 2 : 1);
      setDestination('');
      setSelectedCarRegistration('');
      
      // ✅ CRITICAL: Enhanced multi-strategy refresh system
      console.log('🔄 Initiating comprehensive car data refresh...');
      
      // Strategy 1: Immediate callback refresh (0ms)
      if (carRefreshCallback) {
        console.log('🔄 Strategy 1: Immediate callback refresh...');
        try {
          carRefreshCallback();
        } catch (error) {
          console.warn('⚠️ Strategy 1 failed:', error);
        }
      }
      
      // Strategy 2: Quick delay refresh (300ms)
      setTimeout(async () => {
        if (carRefreshCallback) {
          console.log('🔄 Strategy 2: Quick delay refresh (300ms)...');
          try {
            carRefreshCallback();
          } catch (error) {
            console.warn('⚠️ Strategy 2 failed:', error);
          }
        }
      }, 300);
      
      // Strategy 3: Medium delay refresh (800ms) 
      setTimeout(async () => {
        if (carRefreshCallback) {
          console.log('🔄 Strategy 3: Medium delay refresh (800ms)...');
          try {
            carRefreshCallback();
          } catch (error) {
            console.warn('⚠️ Strategy 3 failed:', error);
          }
        }
      }, 800);
      
      // Strategy 4: Extended delay refresh (1500ms)
      setTimeout(async () => {
        if (carRefreshCallback) {
          console.log('🔄 Strategy 4: Extended delay refresh (1500ms)...');
          try {
            carRefreshCallback();
          } catch (error) {
            console.warn('⚠️ Strategy 4 failed:', error);
          }
        }
      }, 1500);
      
      // Strategy 5: LocalStorage broadcast
      try {
        const updateData = {
          carRegistration: selectedCarRegistration,
          timestamp: Date.now(),
          ticketsCreated: tickets.length,
          passengerCount: quantity,
          action: 'ticket_created'
        };
        localStorage.setItem('car-usage-updated', JSON.stringify(updateData));
        console.log('🔄 Strategy 5: LocalStorage broadcast sent', updateData);
      } catch (error) {
        console.warn('⚠️ Strategy 5 failed:', error);
      }
      
      // Strategy 6: Window event broadcast
      try {
        const eventData = {
          carRegistration: selectedCarRegistration,
          timestamp: Date.now(),
          ticketsCreated: tickets.length,
          passengerCount: quantity,
          action: 'ticket_created'
        };
        window.dispatchEvent(new CustomEvent('carUsageUpdated', {
          detail: eventData
        }));
        console.log('🔄 Strategy 6: Window event broadcast sent', eventData);
      } catch (error) {
        console.warn('⚠️ Strategy 6 failed:', error);
      }
      
      // Strategy 7: Force API cache invalidation
      try {
        const invalidateUrl = `/api/cars/usage?carRegistration=${selectedCarRegistration}&date=${new Date().toISOString().split('T')[0]}&_invalidate=${Date.now()}`;
        fetch(invalidateUrl, { 
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }).catch(err => console.warn('⚠️ Strategy 7 failed:', err));
        console.log('🔄 Strategy 7: API cache invalidation triggered');
      } catch (error) {
        console.warn('⚠️ Strategy 7 failed:', error);
      }
      
      // พิมพ์ตั๋ว
      setTimeout(() => {
        handlePrintWithTickets(tickets);
      }, 100);
      
      return tickets;
    } catch (error: any) {
      console.error('❌ Error selling ticket:', error);
      notificationService.error(error.message || 'ເກີດຂໍ້ຜິດພາດໃນການຂາຍປີ້');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    ticketPrice, paymentMethod, quantity, ticketType, destination, selectedCarRegistration, 
    getDestinationText, carRefreshCallback
  ]);

  // Print function - ไม่มี booking info
  const handlePrintWithTickets = useCallback(async (tickets: Ticket[]) => {
    if (!Array.isArray(tickets) || tickets.length === 0) {
      console.warn('No tickets to print or invalid tickets array');
      return;
    }

    try {
      const ticketsWithQR = await Promise.all(
        tickets.map(async (ticket) => {
          const qrData = generateQRCodeData(ticket);
          const qrCodeImage = await generateQRCodeSVG(qrData);
          return { ...ticket, qrCodeImage };
        })
      );

      // Fetch car information for printing
      let carInfo = null;
      if (selectedCarRegistration) {
        try {
          const response = await fetch(`/api/cars`);
          if (response.ok) {
            const cars = await response.json();
            if (Array.isArray(cars) && cars.length > 0) {
              const selectedCar = cars.find((car: any) => car.car_registration === selectedCarRegistration);
              if (selectedCar) {
                carInfo = {
                  registration: selectedCar.car_registration || '',
                  name: selectedCar.car_name || '',
                  driverName: selectedCar.user_id?.name || 'Unknown',
                  driverEmployeeId: selectedCar.user_id?.employeeId || 'N/A'
                };
              }
            }
          }
        } catch (error) {
          console.warn('Failed to fetch car info for printing:', error);
        }
      }

      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      
      document.body.appendChild(iframe);
      
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bus Tickets</title>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Phetsarath:wght@400;700&display=swap');
            * { font-family: "Phetsarath", serif; margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: 80mm auto; margin: 0; }
            body { width: 80mm; margin: 0; padding: 0; background: white; font-size: 12px; line-height: 1.3; }
            .receipt-container { width: 80mm; margin: 0; padding: 3mm; background: white; page-break-after: always; page-break-inside: avoid; }
            .receipt-container:last-child { page-break-after: avoid; }
            .receipt-header { text-align: center; }
            .company-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
            .company-subtitle { font-size: 14px; margin-bottom: 1px; }
            .divider { border-top: 1px solid black; margin: 0.5mm 0; }
            .content-section { margin: 4mm 0; }
            .detail-item { display: flex; align-items: center; margin-bottom: 1mm; font-size: 12px; position: relative; }
            .detail-label { font-weight: normal; width: 45%; text-align: left; }
            .detail-colon { position: absolute; left: 50%; transform: translateX(-50%); background: rgba(128, 128, 128, 0.1); padding: 1px 3px; border-radius: 2px; font-weight: bold; }
            .detail-value { font-weight: bold; width: 45%; text-align: right; margin-left: auto; }
            .car-info { background: #e3f2fd; padding: 2mm; margin: 2mm 0; border-radius: 2mm; }
            .qr-section { text-align: center; margin: 0mm 0; background: #f8f9fa; border-radius: 4px; }
            .qr-code { margin: 0mm 0; }
            .qr-code img { width: 200px; height: 200px; border: 1px solid #ddd; background: white; padding: 2px; }
            .receipt-footer { text-align: center; margin-top: 2mm; font-size: 13px; font-weight: bold; color: #666; }
            .driver-info { background: #e3f2fd; padding: 2mm; margin: 2mm 0; border-radius: 2mm; }
          </style>
        </head>
        <body>
          ${ticketsWithQR.map((ticket, index) => `
            <div class="receipt-container">
              <div class="receipt-header">
                <div class="company-name">ປີ້ລົດຕູ້ໂດຍສານ</div>
                <div class="company-name">ປະຈຳສະຖານີລົດໄຟຫຼວງພະບາງ</div>
                <div class="company-subtitle">Passenger Van Ticket</div>
                <div class="company-subtitle">at Luang Prabang Railway Station</div>
              </div>
              
              <div class="divider"></div>
              
              <div class="content-section">
                <div class="detail-item">
                  <span class="detail-label">ເລກທີ/No</span>
                  <span class="detail-colon">:</span>
                  <span class="detail-value">${ticket.ticketNumber}</span>
                </div>
                
                ${ticket.ticketType === 'group' ? `
                  <div class="detail-item">
                    <span class="detail-label">ຈຳນວນຄົນ/Persons</span>
                    <span class="detail-colon">:</span>
                    <span class="detail-value">${ticket.passengerCount} ຄົນ</span>
                  </div>
                ` : ''}
                
                <div class="detail-item">
                  <span class="detail-label">ວັນເວລາ/DateTime</span>
                  <span class="detail-colon">:</span>
                  <span class="detail-value">${formatDateShort(new Date(ticket.soldAt))}/${formatTimeShort(new Date(ticket.soldAt))}</span>
                </div>
                
                <div class="detail-item">
                  <span class="detail-label">ລາຄາລວມ/Total</span>
                  <span class="detail-colon">:</span>
                  <span class="detail-value">₭${ticket.price.toLocaleString()}</span>
                </div>
                
                <div class="detail-item">
                  <span class="detail-label">ຊຳລະ/Payment</span>
                  <span class="detail-colon">:</span>
                  <span class="detail-value">${getPaymentMethodText(ticket.paymentMethod)}</span>
                </div>

                <div class="detail-item">
                  <span class="detail-label">ອອກໂດຍ/Sold By</span>
                  <span class="detail-colon">:</span>
                  <span class="detail-value">${ticket.soldBy || 'System'}</span>
                </div>
              </div>
              
              <div class="divider"></div>
              
              ${carInfo ? `
                <div class="driver-info">
                  <div style="font-weight: bold; text-align: center; margin-bottom: 1mm;">🚐 ຂໍ້ມູນລົດທີ່ແນະນຳ</div>
                  <div class="detail-item">
                    <span class="detail-label">ທະບຽນລົດ/Car</span>
                    <span class="detail-colon">:</span>
                    <span class="detail-value">${carInfo.registration}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">ຄົນຂັບ/Driver</span>
                    <span class="detail-colon">:</span>
                    <span class="detail-value">${carInfo.driverName}</span>
                  </div>
                </div>
                <div class="divider"></div>
              ` : ''}
              
              <div class="content-section" style="text-align: center;">
                <div style="font-weight: bold; margin-bottom: 0mm;">ສະຖານີລົດໄຟ → ${ticket.destination || getDestinationText()}</div>
                <div style="font-weight: bold;">TRAIN STATION → ${(ticket.destination || getDestinationText()).toUpperCase()}</div>
              </div>
              
              <div class="divider"></div>
              
              ${ticket.qrCodeImage ? `
                <div class="qr-section">
                  <div class="qr-code">
                    <img src="${ticket.qrCodeImage}" alt="QR Code" />
                  </div>
                </div>
                <div class="divider"></div>
              ` : ''}
              
              <div class="receipt-footer">
                <div style="margin-bottom: 1mm;">( ຂໍໃຫ້ທ່ານເດີນທາງປອດໄພ )</div>
              </div>
            </div>
          `).join('')}
        </body>
        </html>
      `;
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(printHTML);
        iframeDoc.close();
        
        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (error) {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(printHTML);
                printWindow.document.close();
                printWindow.onload = () => {
                  printWindow.print();
                  printWindow.close();
                };
              }
            }
            
            setTimeout(() => {
              try {
                document.body.removeChild(iframe);
              } catch (e) {
                console.warn('Failed to remove iframe:', e);
              }
            }, 2000);
          }, 500);
        };
      }
    } catch (error) {
      console.error('Error in handlePrintWithTickets:', error);
      notificationService.error('ເກີດຂໍ້ຜິດພາດໃນການພິມປີ້');
    }
  }, [getDestinationText, selectedCarRegistration]);
  
  return {
    ticketPrice,
    priceLoading,
    paymentMethod,
    setPaymentMethod,
    loading,
    createdTickets,
    showConfirmation,
    cancelConfirmation,
    confirmSellTicket,
    showConfirmModal,
    quantity,
    updateQuantity,
    handlePrintWithTickets,
    ticketType,
    updateTicketType,
    refreshTicketPrice,
    destination,
    updateDestination,
    
    // Car Selection
    selectedCarRegistration,
    updateSelectedCar,
    
    // ✅ เพิ่ม function สำหรับ register car refresh callback
    registerCarRefreshCallback
  };
}