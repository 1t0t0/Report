// app/booking/page.tsx - Next.js 15 Improved Booking Page
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { 
  FiCalendar, 
  FiMapPin, 
  FiUsers, 
  FiUser, 
  FiPhone, 
  FiMail,
  FiUpload,
  FiCheck,
  FiArrowRight,
  FiArrowLeft,
  FiCreditCard
} from 'react-icons/fi';

interface BookingData {
  // Section 1: Trip Details
  travel_date: string;
  destination: string;
  passenger_count: number;
  
  // Section 2: Customer Info
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  
  // Section 3: Payment
  payment_slip_url: string;
  total_price: number;
}

interface StepIndicatorProps {
  step: number;
  currentStep: number;
  title: string;
  description: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ step, currentStep, title, description }) => {
  const getStepStatus = () => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'active';
    return 'pending';
  };

  const status = getStepStatus();

  return (
    <div className="flex items-center">
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
        ${status === 'completed' ? 'bg-green-500 text-white' : ''}
        ${status === 'active' ? 'bg-blue-500 text-white' : ''}
        ${status === 'pending' ? 'bg-gray-200 text-gray-500' : ''}
      `}>
        {status === 'completed' ? <FiCheck /> : step}
      </div>
      <div className="ml-3 hidden md:block">
        <p className={`text-sm font-medium ${status === 'active' ? 'text-blue-600' : 'text-gray-500'}`}>
          {title}
        </p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </div>
  );
};

export default function ImprovedBookingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');

  const [formData, setFormData] = useState<BookingData>({
    travel_date: '',
    destination: '',
    passenger_count: 1,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    payment_slip_url: '',
    total_price: 45000
  });

  const PRICE_PER_PERSON = 45000;

  // Set date limits (today to 5 days ahead)
  useEffect(() => {
    const today = new Date();
    const maxBookingDate = new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000));
    
    setMinDate(today.toISOString().split('T')[0]);
    setMaxDate(maxBookingDate.toISOString().split('T')[0]);
  }, []);

  // Calculate total price when passenger count changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      total_price: PRICE_PER_PERSON * prev.passenger_count
    }));
  }, [formData.passenger_count]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'passenger_count' ? parseInt(value) : value
    }));
  };

  // Validate current step
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.travel_date && formData.destination && formData.passenger_count);
      case 2:
        return !!(formData.customer_name && formData.customer_phone && formData.customer_email);
      case 3:
        return !!formData.payment_slip_url;
      default:
        return false;
    }
  };

  // Handle next step
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    } else {
      toast.error('ກະລຸນາໃສ່ຂໍ້ມູນໃຫ້ຄົບຖ້ວນ');
    }
  };

  // Handle previous step
  const handlePreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Handle slip upload
  const handleSlipUpload = async (file: File) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('ປະເພດໄຟລ໌ບໍ່ຖືກຕ້ອງ. ອະນຸຍາດເຉພາະ JPG, PNG, WebP');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('ໄຟລ໌ໃຫຍ່ເກີນໄປ. ຂະໜາດໄຟລ໌ຕ້ອງບໍ່ເກີນ 5MB');
      return;
    }

    try {
      setUploadingSlip(true);

      const uploadFormData = new FormData();
      uploadFormData.append('slip', file);
      uploadFormData.append('customerName', formData.customer_name);
      uploadFormData.append('bookingRef', 'temp');

      const response = await fetch('/api/upload-slip', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (result.success) {
        setFormData(prev => ({ ...prev, payment_slip_url: result.url }));
        toast.success('ອັບໂຫຼດສະລິບສຳເລັດ!');
      } else {
        toast.error(result.error || 'ເກີດຂໍ້ຜິດພາດໃນການອັບໂຫຼດ');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນການອັບໂຫຼດ');
    } finally {
      setUploadingSlip(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep(3)) {
      toast.error('ກະລຸນາໃສ່ຂໍ້ມູນໃຫ້ຄົບຖ້ວນ');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('ຈອງສຳເລັດ! ກະລຸນາລໍຖ້າການອະນຸມັດ');
        router.push(`/booking/success?id=${result.booking_id}`);
      } else {
        toast.error(result.error || 'ເກີດຂໍ້ຜິດພາດໃນການຈອງ');
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນລະບົບ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ຈອງປີ້ລົດຕູ້</h1>
                <p className="text-xs text-gray-500">ລົດໄຟ ລາວ-ຈີນ</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="/booking/status" className="text-gray-600 hover:text-gray-900 transition-colors">ເຊັກສະຖານະ</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">ຕິດຕໍ່</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between">
            <StepIndicator 
              step={1} 
              currentStep={currentStep} 
              title="ເລືອກວັນທີ່ແລະປາຍທາງ" 
              description="ວັນທີ່, ສະຖານທີ່, ຈຳນວນຄົນ" 
            />
            <div className="flex-1 mx-4 border-t-2 border-gray-200 mt-5"></div>
            <StepIndicator 
              step={2} 
              currentStep={currentStep} 
              title="ຂໍ້ມູນຜູ້ຈອງ" 
              description="ຊື່, ອີເມລ, ເບີໂທ" 
            />
            <div className="flex-1 mx-4 border-t-2 border-gray-200 mt-5"></div>
            <StepIndicator 
              step={3} 
              currentStep={currentStep} 
              title="ການຊຳລະເງິນ" 
              description="ສະລິບ, ສະຫຼຸບຍອດ" 
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Section 1: Trip Details */}
          {currentStep === 1 && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">ເລືອກວັນທີ່ແລະປາຍທາງ</h2>
                <p className="text-gray-600">ເລືອກວັນທີ່ທີ່ທ່ານຕ້ອງການເດີນທາງ ແລະ ບອກພວກເຮົາວ່າທ່ານຢາກໄປໃສ</p>
              </div>

              <div className="space-y-6">
                {/* Travel Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiCalendar className="inline w-4 h-4 mr-2 text-blue-500" />
                    ວັນທີ່ເດີນທາງ *
                  </label>
                  <input
                    type="date"
                    name="travel_date"
                    value={formData.travel_date}
                    onChange={handleInputChange}
                    min={minDate}
                    max={maxDate}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">ຈອງລ່ວງໜ້າໄດ້ເຖິງ 5 ວັນ</p>
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiMapPin className="inline w-4 h-4 mr-2 text-red-500" />
                    ປາຍທາງ / ສະຖານທີ່ທີ່ຕ້ອງການໄປ *
                  </label>
                  <textarea
                    name="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="ບອກພວກເຮົາວ່າທ່ານຕ້ອງການໄປໃສ ເຊັ່ນ: ເຮືອນ, ຫ້າງ, ໂຮງຮຽນ, ຫຼື ບ່ອນສະເພາະ..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    required
                  />
                </div>

                {/* Passenger Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiUsers className="inline w-4 h-4 mr-2 text-green-500" />
                    ຈຳນວນຜູ້ໂດຍສານ *
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1,2,3,4,5,6,7,8,9,10].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, passenger_count: num }))}
                        className={`px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                          formData.passenger_count === num
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    ລາຄາ: ₭{PRICE_PER_PERSON.toLocaleString()} × {formData.passenger_count} ຄົນ = 
                    <span className="font-bold text-blue-600"> ₭{formData.total_price.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              {/* Next Button */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleNextStep}
                  disabled={!validateStep(1)}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center"
                >
                  ຕໍ່ໄປ
                  <FiArrowRight className="ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Customer Information */}
          {currentStep === 2 && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">ຂໍ້ມູນຜູ້ຈອງ</h2>
                <p className="text-gray-600">ໃສ່ຂໍ້ມູນຂອງທ່ານເພື່ອຢືນຢັນການຈອງ</p>
              </div>

              <div className="space-y-6">
                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiUser className="inline w-4 h-4 mr-2 text-purple-500" />
                    ຊື່ຜູ້ຈອງ *
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    placeholder="ໃສ່ຊື່ເຕັມຂອງທ່ານ"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg"
                    required
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiPhone className="inline w-4 h-4 mr-2 text-green-500" />
                    ເບີໂທລະສັບ *
                  </label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleInputChange}
                    placeholder="020 XXXX XXXX"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">ເບີໂທລະສັບຕ້ອງເປັນ 10 ຫຼັກ</p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiMail className="inline w-4 h-4 mr-2 text-blue-500" />
                    ອີເມລ *
                  </label>
                  <input
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleInputChange}
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">ສຳລັບສົ່ງການຢືນຢັນແລະ QR Code</p>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="mt-8 flex justify-between">
                <button
                  onClick={handlePreviousStep}
                  className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium flex items-center"
                >
                  <FiArrowLeft className="mr-2" />
                  ກັບຄືນ
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!validateStep(2)}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center"
                >
                  ຕໍ່ໄປ
                  <FiArrowRight className="ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Payment & Summary */}
          {currentStep === 3 && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">ສະຫຼຸບການຈອງ ແລະ ການຊຳລະເງິນ</h2>
                <p className="text-gray-600">ກວດສອບຂໍ້ມູນແລະອັບໂຫຼດສະລິບການໂອນເງິນ</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">ສະຫຼຸບການຈອງ</h3>
                  
                  <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ວັນທີ່ເດີນທາງ:</span>
                      <span className="font-medium">{new Date(formData.travel_date).toLocaleDateString('lo-LA')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ຈຳນວນຜູ້ໂດຍສານ:</span>
                      <span className="font-medium">{formData.passenger_count} ຄົນ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ຜູ້ຈອງ:</span>
                      <span className="font-medium">{formData.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ເບີໂທ:</span>
                      <span className="font-medium">{formData.customer_phone}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">ລາຄາຕໍ່ຄົນ:</span>
                        <span className="font-medium">₭{PRICE_PER_PERSON.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold text-blue-600 mt-2">
                        <span>ລາຄາລວມ:</span>
                        <span>₭{formData.total_price.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <h4 className="font-medium text-blue-900 mb-2">ຂໍ້ມູນບັນຊີສຳລັບໂອນເງິນ</h4>
                    <div className="text-sm text-blue-800">
                      <p><strong>ທະນາຄານ:</strong> BCEL</p>
                      <p><strong>ເລກບັນຊີ:</strong> 1234-567-890-123</p>
                      <p><strong>ຊື່ບັນຊີ:</strong> ລົດຕູ້ໂດຍສານ ລາວ-ຈີນ</p>
                    </div>
                  </div>
                </div>

                {/* Payment Upload */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">ອັບໂຫຼດສະລິບການໂອນເງິນ</h3>
                  
                  {!formData.payment_slip_url ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => e.target.files?.[0] && handleSlipUpload(e.target.files[0])}
                        className="hidden"
                        id="slip-upload"
                        disabled={uploadingSlip}
                      />
                      <label htmlFor="slip-upload" className="cursor-pointer">
                        <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-600 mb-2">
                          {uploadingSlip ? 'ກຳລັງອັບໂຫຼດ...' : 'ຄລິກເພື່ອອັບໂຫຼດສະລິບ'}
                        </p>
                        <p className="text-sm text-gray-500">JPG, PNG, WebP (ສູງສຸດ 5MB)</p>
                      </label>
                      
                      {uploadingSlip && (
                        <div className="mt-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-green-200 rounded-xl p-6 bg-green-50">
                      <div className="flex items-center space-x-4">
                        <FiCheck className="h-8 w-8 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-green-700">ອັບໂຫຼດສະລິບສຳເລັດ</p>
                          <p className="text-sm text-green-600">ໄຟລ໌ພ້ອມສຳລັບການຈອງ</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, payment_slip_url: '' }))}
                          className="text-green-600 hover:text-green-800 underline text-sm"
                        >
                          ປ່ຽນໄຟລ໌
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
                <h4 className="font-semibold text-yellow-800 mb-3">📋 ເງື່ອນໄຂການຈອງ</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• ຕ້ອງຊຳລະເງິນເຕັມຈຳນວນ ບໍ່ມີລະບົບມັດຈຳ</li>
                  <li>• ສາມາດຍົກເລີກໄດ້ພາຍໃນ 10 ຊົ່ວໂມງຫຼັງຈອງ</li>
                  <li>• Admin ຈະກວດສອບແລະອະນຸມັດພາຍໃນ 24 ຊົ່ວໂມງ</li>
                  <li>• ເມື່ອອະນຸມັດແລ້ວຈະໄດ້ຮັບ QR Code ສຳລັບເດີນທາງ</li>
                </ul>
              </div>

              {/* Navigation Buttons */}
              <div className="mt-8 flex justify-between">
                <button
                  onClick={handlePreviousStep}
                  className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium flex items-center"
                >
                  <FiArrowLeft className="mr-2" />
                  ກັບຄືນ
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !validateStep(3)}
                  className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      ກຳລັງສົ່ງ...
                    </>
                  ) : (
                    <>
                      <FiCreditCard className="mr-2" />
                      ຢືນຢັນການຈອງ
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}