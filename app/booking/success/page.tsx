// app/booking/success/page.tsx - หน้าแสดงการจองสำเร็จ
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FiCheckCircle, 
  FiCalendar, 
  FiMapPin, 
  FiUsers, 
  FiDollarSign,
  FiMail,
  FiPhone,
  FiClock,
  FiArrowRight,
  FiHome,
  FiRefreshCw,
  FiAlertCircle,
  FiCopy,
  FiCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface BookingData {
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  travel_date: string;
  passenger_count: number;
  destination: string;
  total_price: number;
  payment_status: string;
  can_cancel_until: string;
  created_at: string;
}

// Component หลักที่แสดงข้อมูลการจอง
function BookingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const bookingId = searchParams.get('id');

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails(bookingId);
    } else {
      setError('ບໍ່ພົບເລກທີ່ການຈອງ');
      setLoading(false);
    }
  }, [bookingId]);

  const fetchBookingDetails = async (id: string) => {
    try {
      setLoading(true);
      
      // สำหรับหน้า success เราจะใช้วิธีง่ายๆ คือแสดงข้อมูลที่ได้จากการจอง
      // หรือสามารถเรียก API เพื่อดึงข้อมูลล่าสุดได้
      
      // ตัวอย่างข้อมูลที่จะแสดง (ในความเป็นจริงอาจมาจาก localStorage หรือ session)
      // หรือเรียก API แต่ต้องมี authentication
      
      // สำหรับตอนนี้เราจะแสดงข้อมูลพื้นฐานโดยใช้ booking_id
      setBooking({
        booking_id: id,
        customer_name: 'กำลังโหลด...',
        customer_phone: '',
        customer_email: '',
        travel_date: new Date().toISOString(),
        passenger_count: 1,
        destination: '',
        total_price: 45000,
        payment_status: 'pending',
        can_cancel_until: new Date(Date.now() + (10 * 60 * 60 * 1000)).toISOString(),
        created_at: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Fetch booking error:', error);
      setError('ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນ');
    } finally {
      setLoading(false);
    }
  };

  const copyBookingId = async () => {
    if (!booking) return;
    
    try {
      await navigator.clipboard.writeText(booking.booking_id);
      setCopied(true);
      toast.success('ຄັດລອກເລກທີ່ການຈອງແລ້ວ!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('ບໍ່ສາມາດຄັດລອກໄດ້');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('lo-LA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('lo-LA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">ກຳລັງໂຫລດຂໍ້ມູນການຈອງ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiAlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ເກີດຂໍ້ຜິດພາດ</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Link 
              href="/booking"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <FiArrowRight className="mr-2" />
              ຈອງໃໝ່
            </Link>
            <br />
            <Link 
              href="/booking/status"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              ເຊັກສະຖານະການຈອງ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <FiCheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ການຈອງສຳເລັດ</h1>
                <p className="text-xs text-gray-500">ລະບົບອອກປີ້ລົດຕູ້ໂດຍສານ</p>
              </div>
            </div>
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors flex items-center">
              <FiHome className="mr-2" />
              ໜ້າຫຼັກ
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <FiCheckCircle className="w-12 h-12 text-white animate-bounce" />
              </div>
              <div className="absolute inset-0 w-24 h-24 bg-green-400 rounded-full mx-auto animate-ping opacity-20"></div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">🎉 ຈອງສຳເລັດແລ້ວ!</h1>
            <p className="text-xl text-gray-600 mb-2">ການຈອງຂອງທ່ານໄດ້ຮັບແລ້ວ</p>
            <p className="text-gray-500">ກະລຸນາລໍຖ້າການອະນຸມັດຈາກ Admin</p>
          </div>

          {/* Booking ID Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-green-200">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">ເລກທີ່ການຈອງຂອງທ່ານ</h2>
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white mb-6">
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-3xl font-bold tracking-wider">{booking?.booking_id}</span>
                  <button
                    onClick={copyBookingId}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                    title="ຄັດລອກເລກທີ່ການຈອງ"
                  >
                    {copied ? <FiCheck className="w-5 h-5" /> : <FiCopy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-blue-100 mt-2">ກະລຸນາເກັບເລກທີ່ການຈອງນີ້ໄວ້</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-4">
                  <FiCalendar className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-600">ວັນທີ່ຈອງ</p>
                  <p className="font-semibold">{formatDate(booking?.created_at || '')}</p>
                  <p className="text-xs text-gray-500">{formatTime(booking?.created_at || '')}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <FiClock className="w-5 h-5 text-yellow-600 mx-auto mb-2" />
                  <p className="text-gray-600">ສະຖານະ</p>
                  <p className="font-semibold text-yellow-700">ລໍຖ້າການອະນຸມັດ</p>
                  <p className="text-xs text-yellow-600">📋 ກຳລັງກວດສອບ</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <FiMail className="w-5 h-5 text-green-600 mx-auto mb-2" />
                  <p className="text-gray-600">ການແຈ້ງເຕືອນ</p>
                  <p className="font-semibold text-green-700">ສົ່ງອີເມລແລ້ວ</p>
                  <p className="text-xs text-green-600">📧 ກວດເບິ່ງອີເມລ</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <FiArrowRight className="mr-3 text-blue-500" />
              ຂັ້ນຕອນຕໍ່ໄປ
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-xl">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Admin ກຳລັງກວດສອບ</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    ພະນັກງານຈະກວດສອບຂໍ້ມູນແລະສະລິບການໂອນເງິນຂອງທ່ານ
                    <br />
                    <span className="text-blue-600 font-medium">ໃຊ້ເວລາປະມານ 1-24 ຊົ່ວໂມງ</span>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 bg-yellow-50 rounded-xl">
                <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">ໄດ້ຮັບການແຈ້ງເຕືອນ</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    ທ່ານຈະໄດ້ຮັບອີເມລແຈ້ງຜົນການອະນຸມັດ
                    <br />
                    <span className="text-yellow-600 font-medium">ກວດເບິ່ງອີເມລ (รวมถึง Spam)</span>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-xl">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">ເດີນທາງວັນທີ່ກຳນົດ</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    ເມື່ອອະນຸມັດແລ້ວ ທ່ານຈະໄດ້ຮັບ QR Code ສຳລັບການເດີນທາງ
                    <br />
                    <span className="text-green-600 font-medium">ນຳ QR Code ມາສະແກນກັບຄົນຂັບ</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Info */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-8 mb-8">
            <div className="flex items-start space-x-4">
              <FiAlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-orange-800 mb-3">ຂໍ້ມູນສຳຄັນ ⚠️</h3>
                <ul className="space-y-2 text-orange-700">
                  <li className="flex items-start">
                    <span className="text-orange-500 mr-2">•</span>
                    <span><strong>ການຍົກເລີກ:</strong> ສາມາດຍົກເລີກໄດ້ພາຍໃນ 10 ຊົ່ວໂມງຫຼັງຈອງ</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-500 mr-2">•</span>
                    <span><strong>ເກັບເລກທີ່ການຈອງ:</strong> ໃຊ້ສຳລັບການຕິດຕາມແລະເຊັກສະຖານະ</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-500 mr-2">•</span>
                    <span><strong>ການຕິດຕໍ່:</strong> ຫາກມີຄຳຖາມ ກະລຸນາຕິດຕໍ່ Admin ພ້ອມເລກທີ່ການຈອງ</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/booking/status"
              className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <FiRefreshCw className="mr-2" />
              ເຊັກສະຖານະການຈອງ
            </Link>
            
            <Link 
              href="/booking"
              className="flex items-center justify-center px-6 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              <FiCalendar className="mr-2" />
              ຈອງໃໝ່
            </Link>
            
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
            >
              <FiDollarSign className="mr-2" />
              ພິມໃບຢືນຢັນ
            </button>
          </div>

          {/* Contact Info */}
          <div className="text-center mt-8 p-6 bg-white/50 rounded-xl">
            <p className="text-gray-600 mb-2">ຫາກມີຄຳຖາມ ກະລຸນາຕິດຕໍ່:</p>
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center text-gray-700">
                <FiPhone className="mr-2 text-blue-500" />
                <span>020 XXXX XXXX</span>
              </div>
              <div className="flex items-center text-gray-700">
                <FiMail className="mr-2 text-green-500" />
                <span>support@busticket.la</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Main Component with Suspense
export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">ກຳລັງໂຫລດ...</p>
        </div>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}