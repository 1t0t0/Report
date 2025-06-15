// components/booking/BookingForm.tsx - Main Booking Form
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface BookingFormProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

interface BookingData {
  travel_date: string;
  passenger_count: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
}

const BookingForm: React.FC<BookingFormProps> = ({ currentStep, setCurrentStep }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData>({
    travel_date: '',
    passenger_count: 1,
    contact_name: '',
    contact_phone: '',
    contact_email: ''
  });

  // Get date constraints
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 10);
  
  const minDateStr = today.toISOString().split('T')[0];
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const handleInputChange = (field: keyof BookingData, value: string | number) => {
    setBookingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep1 = (): boolean => {
    if (!bookingData.travel_date) {
      toast.error('ກະລຸນາເລືອກວັນທີເດີນທາງ');
      return false;
    }
    if (bookingData.passenger_count < 1 || bookingData.passenger_count > 10) {
      toast.error('ຈຳນວນຜູ້ໂດຍສານຕ້ອງຢູ່ລະຫວ່າງ 1-10 ຄົນ');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!bookingData.contact_name.trim()) {
      toast.error('ກະລຸນາໃສ່ຊື່');
      return false;
    }
    if (!bookingData.contact_phone.trim()) {
      toast.error('ກະລຸນາໃສ່ເບີໂທ');
      return false;
    }
    if (!bookingData.contact_email.trim()) {
      toast.error('ກະລຸນາໃສ່ອີເມວ');
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingData.contact_email)) {
      toast.error('ຮູບແບບອີເມວບໍ່ຖືກຕ້ອງ');
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      handleBookingSubmit();
    }
  };

  const handleBookingSubmit = async () => {
    try {
      setLoading(true);
      
      // Step 1: สร้าง Booking
      const bookingResponse = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      
      const bookingResult = await bookingResponse.json();
      
      if (!bookingResult.success) {
        throw new Error(bookingResult.error);
      }
      
      setCurrentStep(3);
      
      // Step 2: สร้าง Payment Link
      const paymentResponse = await fetch('/api/booking/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingResult.booking.booking_id })
      });
      
      const paymentResult = await paymentResponse.json();
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error);
      }
      
      // Step 3: Redirect ไป Payment Gateway
      toast.success('ກຳລັງນຳທ່ານໄປຫນ້າຊຳລະເງິນ...');
      
      // เก็บ booking_id ไว้ใน localStorage เพื่อใช้หลังจาก payment
      localStorage.setItem('pending_booking_id', bookingResult.booking.booking_id);
      
      // Redirect to Lailao Payment
      window.location.href = paymentResult.payment_url;
      
    } catch (error) {
      console.error('Booking error:', error);
      toast.error((error as Error).message || 'ເກີດຂໍ້ຜິດພາດ');
      setCurrentStep(2); // Back to form
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = bookingData.passenger_count * 45000;

  return (
    <div>
      {currentStep === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📅 ເລືອກວັນທີ ແລະ ຈຳນວນຜູ້ໂດຍສານ
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ວັນທີເດີນທາງ *
            </label>
            <input
              type="date"
              value={bookingData.travel_date}
              onChange={(e) => handleInputChange('travel_date', e.target.value)}
              min={minDateStr}
              max={maxDateStr}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              ສາມາດຈອງໄດ້ສູງສຸດ 10 ວັນຂ້າງໜ້າ
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ຈຳນວນຜູ້ໂດຍສານ *
            </label>
            <select
              value={bookingData.passenger_count}
              onChange={(e) => handleInputChange('passenger_count', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} ຄົນ
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">💰 ສະຫຼຸບລາຄາ</h3>
            <div className="space-y-1 text-sm text-blue-700">
              <div className="flex justify-between">
                <span>ລາຄາຕໍ່ຄົນ:</span>
                <span>₭45,000</span>
              </div>
              <div className="flex justify-between">
                <span>ຈຳນວນຜູ້ໂດຍສານ:</span>
                <span>{bookingData.passenger_count} ຄົນ</span>
              </div>
              <div className="border-t border-blue-200 pt-1 flex justify-between font-semibold">
                <span>ລາຄາລວມ:</span>
                <span>₭{totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📝 ຂໍ້ມູນຜູ້ຕິດຕໍ່
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ຊື່ຜູ້ຕິດຕໍ່ *
            </label>
            <input
              type="text"
              value={bookingData.contact_name}
              onChange={(e) => handleInputChange('contact_name', e.target.value)}
              placeholder="ໃສ່ຊື່ຂອງທ່ານ"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ເບີໂທຕິດຕໍ່ *
            </label>
            <input
              type="tel"
              value={bookingData.contact_phone}
              onChange={(e) => handleInputChange('contact_phone', e.target.value)}
              placeholder="020xxxxxxxx"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ອີເມວ *
            </label>
            <input
              type="email"
              value={bookingData.contact_email}
              onChange={(e) => handleInputChange('contact_email', e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              QR Code ຈະຖືກສົ່ງໄປທີ່ອີເມວນີ້
            </p>
          </div>

          {/* Review Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-3">📋 ກວດສອບຂໍ້ມູນ</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>ວັນທີເດີນທາງ:</span>
                <span>{new Date(bookingData.travel_date).toLocaleDateString('lo-LA')}</span>
              </div>
              <div className="flex justify-between">
                <span>ຈຳນວນຜູ້ໂດຍສານ:</span>
                <span>{bookingData.passenger_count} ຄົນ</span>
              </div>
              <div className="flex justify-between font-semibold text-blue-600">
                <span>ລາຄາລວມ:</span>
                <span>₭{totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            ກຳລັງດຳເນີນການ...
          </h2>
          <p className="text-gray-600">
            ກຳລັງນຳທ່ານໄປຫນ້າຊຳລະເງິນ
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1 || loading}
          className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ກັບຄືນ
        </button>
        
        {currentStep < 3 && (
          <button
            onClick={handleNext}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {currentStep === 1 ? 'ດຳເນີນການຕໍ່' : 'ຊຳລະເງິນ'}
          </button>
        )}
      </div>
    </div>
  );
};

export default BookingForm;