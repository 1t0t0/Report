// app/booking/page.tsx - หน้าจองตั๋วสำหรับลูกค้า (Public)
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { 
  FiPhone, 
  FiMail, 
  FiUser, 
  FiCalendar, 
  FiUsers, 
  FiMapPin,
  FiUpload,
  FiCheck,
  FiClock
} from 'react-icons/fi';

interface BookingFormData {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  travel_date: string;
  passenger_count: number;
  destination: string;
  payment_slip_url: string;
}

export default function BookingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<BookingFormData>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    travel_date: '',
    passenger_count: 1,
    destination: '',
    payment_slip_url: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [totalPrice, setTotalPrice] = useState(45000);
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');

  const PRICE_PER_PERSON = 45000; // LAK

  // Set date limits (today to 5 days ahead)
  useEffect(() => {
    const today = new Date();
    const maxBookingDate = new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000));
    
    setMinDate(today.toISOString().split('T')[0]);
    setMaxDate(maxBookingDate.toISOString().split('T')[0]);
  }, []);

  // Calculate total price when passenger count changes
  useEffect(() => {
    setTotalPrice(PRICE_PER_PERSON * formData.passenger_count);
  }, [formData.passenger_count]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'passenger_count' ? parseInt(value) : value
    }));
  };

  // Handle slip upload
  const handleSlipUpload = async (file: File) => {
    if (!file) return;

    // Validate file
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast.error('ກະລຸນາຍອມຮັບເງື່ອນໄຂການໃຊ້ງານ');
      return;
    }

    if (!formData.payment_slip_url) {
      toast.error('ກະລຸນາອັບໂຫຼດສະລິບການໂອນເງິນ');
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
        // Redirect to status page with booking ID
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
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">BusBooking</h1>
                <p className="text-xs text-gray-500">ລົດໄຟ ລາວ-ຈີນ</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">ໜ້າຫຼັກ</a>
              <a href="/booking/status" className="text-gray-600 hover:text-gray-900 transition-colors">ເຊັກສະຖານະ</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">ຕິດຕໍ່</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            ຈອງປີ້ລົດຕູ້ໂດຍສານ
          </h1>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            ສະດວກ ປອດໄພ ແລະ ລາຄາສົມເຫດສົມຜົນ
            <br/>ຈອງລ່ວງໜ້າໄດ້ເຖິງ 5 ວັນ
          </p>
          <div className="flex justify-center flex-wrap gap-6 text-purple-100">
            <div className="flex items-center">
              <FiCheck className="w-5 h-5 mr-2" />
              ຈອງງ່າຍ
            </div>
            <div className="flex items-center">
              <FiClock className="w-5 h-5 mr-2" />
              ຍົກເລີກໄດ້
            </div>
            <div className="flex items-center">
              <FiCheck className="w-5 h-5 mr-2" />
              ຄຸນນະພາບສູງ
            </div>
          </div>
        </div>
      </section>

      {/* Main Booking Form */}
      <section className="py-16 -mt-10 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">ຈອງປີ້ຂອງທ່ານ</h2>
              <p className="text-gray-600">ໃສ່ຂໍ້ມູນເພື່ອຈອງປີ້ລ່ວງໜ້າ</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ຂໍ້ມູນຜູ້ຈອງ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiUser className="inline w-4 h-4 mr-1" />
                      ຊື່ຜູ້ຈອງ *
                    </label>
                    <input
                      type="text"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      placeholder="ໃສ່ຊື່ຂອງທ່ານ"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiPhone className="inline w-4 h-4 mr-1" />
                      ເບີໂທລະສັບ *
                    </label>
                    <input
                      type="tel"
                      name="customer_phone"
                      value={formData.customer_phone}
                      onChange={handleInputChange}
                      placeholder="020 XXXX XXXX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiMail className="inline w-4 h-4 mr-1" />
                    ອີເມລ *
                  </label>
                  <input
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleInputChange}
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Travel Details */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ຂໍ້ມູນການເດີນທາງ</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiCalendar className="inline w-4 h-4 mr-1" />
                      ວັນທີ່ເດີນທາງ *
                    </label>
                    <input
                      type="date"
                      name="travel_date"
                      value={formData.travel_date}
                      onChange={handleInputChange}
                      min={minDate}
                      max={maxDate}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">ຈອງລ່ວງໜ້າໄດ້ເຖິງ 5 ວັນ</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiUsers className="inline w-4 h-4 mr-1" />
                      ຈຳນວນຜູ້ໂດຍສານ *
                    </label>
                    <select 
                      name="passenger_count"
                      value={formData.passenger_count}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    >
                      {[1,2,3,4,5,6,7,8,9,10].map(num => (
                        <option key={num} value={num}>{num} ຄົນ</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiMapPin className="inline w-4 h-4 mr-1" />
                    ປາຍທາງ / ສະຖານທີ່ທີ່ຕ້ອງການໄປ *
                  </label>
                  <textarea
                    name="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="ບອກພວກເຮົາວ່າທ່ານຕ້ອງການໄປໃສ ເຊັ່ນ: ເຮືອນ, ຫ້າງ, ໂຮງຮຽນ, ຫຼື ບ່ອນສະເພາະ"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
                    required
                  />
                </div>
              </div>

              {/* Price Summary */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ສະຫຼຸບລາຄາ</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ລາຄາຕໍ່ຄົນ</span>
                    <span className="font-medium">₭{PRICE_PER_PERSON.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ຈຳນວນຜູ້ໂດຍສານ</span>
                    <span className="font-medium">{formData.passenger_count} ຄົນ</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">ລາຄາລວມ</span>
                    <span className="text-lg font-bold text-purple-600">₭{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Upload */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ການຊຳລະເງິນ</h3>
                
                {/* Bank Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-3">ຂໍ້ມູນບັນຊີ</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">ບັນຊີ BCEL:</span>
                      <p className="text-blue-900 font-mono text-lg">1234-567-890-123</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">ຊື່ບັນຊີ:</span>
                      <p className="text-blue-900">ລົດຕູ້ໂດຍສານ ລາວ-ຈີນ</p>
                    </div>
                  </div>
                </div>

                {/* Upload Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiUpload className="inline w-4 h-4 mr-1" />
                    ອັບໂຫຼດສະລິບການໂອນເງິນ *
                  </label>
                  
                  {!formData.payment_slip_url ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-all">
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
                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl">
                          <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
                            <span className="text-purple-600 font-medium">ກຳລັງອັບໂຫຼດ...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-green-200 rounded-xl p-4 bg-green-50">
                      <div className="flex items-center space-x-4">
                        <FiCheck className="h-8 w-8 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-green-700">ອັບໂຫຼດສະລິບສຳເລັດ</p>
                          <p className="text-sm text-green-600">ໄຟລ໌ພ້ອມສຳລັບການຈອງ</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, payment_slip_url: '' }))}
                          className="text-green-600 hover:text-green-800"
                        >
                          ປ່ຽນໄຟລ໌
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h4 className="font-semibold text-yellow-800 mb-3">📋 ເງື່ອນໄຂການຈອງ</h4>
                <ul className="text-sm text-yellow-700 space-y-1 mb-4">
                  <li>• ຕ້ອງຊຳລະເງິນເຕັມຈຳນວນ ບໍ່ມີລະບົບມັດຈຳ</li>
                  <li>• ສາມາດຍົກເລີກໄດ້ພາຍໃນ 10 ຊົ່ວໂມງຫຼັງຈອງ</li>
                  <li>• Admin ຈະກວດສອບແລະອະນຸມັດພາຍໃນ 24 ຊົ່ວໂມງ</li>
                  <li>• ເມື່ອອະນຸມັດແລ້ວຈະໄດ້ຮັບ QR Code ສຳລັບເດີນທາງ</li>
                </ul>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="terms" 
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="rounded border-yellow-300 text-purple-600 focus:ring-purple-500" 
                    required 
                  />
                  <label htmlFor="terms" className="ml-2 text-sm text-yellow-700">
                    ຂ້ອຍຍອມຮັບ <button type="button" className="underline font-medium">ເງື່ອນໄຂການໃຊ້ງານ</button>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || uploadingSlip || !agreedToTerms || !formData.payment_slip_url}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 disabled:hover:scale-100"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    ກຳລັງສົ່ງການຈອງ...
                  </div>
                ) : (
                  'ຢືນຢັນການຈອງ'
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}