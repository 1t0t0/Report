// app/booking/status/page.tsx - หน้าเช็คสถานะการจอง
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  FiPhone, 
  FiSend, 
  FiCheck, 
  FiClock, 
  FiAlertCircle,
  FiX,
  FiMessageCircle,
  FiRefreshCw
} from 'react-icons/fi';

interface BookingData {
  booking_id: string;
  customer_name: string;
  travel_date: string;
  passenger_count: number;
  destination: string;
  total_price: number;
  payment_status: 'pending' | 'approved' | 'rejected';
  booking_status: 'active' | 'cancelled';
  can_cancel: boolean;
  can_cancel_until: string;
  created_at: string;
  notes?: string;
}

// Component สำหรับส่งลิงก์เช็คสถานะ
function StatusChecker() {
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendStatusLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone) {
      toast.error('ກະລຸນາໃສ່ເບີໂທລະສັບ');
      return;
    }

    try {
      setSending(true);
      
      const response = await fetch('/api/bookings/send-status-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`ລິ້ງເຊັກສະຖານະໄດ້ຖືກສົ່ງໄປ ${result.email}`);
        setPhone('');
      } else {
        toast.error(result.error || 'ເກີດຂໍ້ຜິດພາດ');
      }
    } catch (error) {
      console.error('Send status link error:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນລະບົບ');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSendStatusLink} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ເບີໂທລະສັບທີ່ໃຊ້ຈອງ
          </label>
          <div className="relative">
            <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="020 XXXX XXXX"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={sending}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50"
        >
          {sending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              ກຳລັງສົ່ງ...
            </>
          ) : (
            <>
              <FiSend className="mr-2" />
              ສົ່ງລິ້ງເຊັກສະຖານະ
            </>
          )}
        </button>
      </form>
      
      <p className="text-xs text-gray-500 mt-3 text-center">
        ລິ້ງເຊັກສະຖານະຈະຖືກສົ່ງໄປທີ່ອີເມລຂອງທ່ານ
      </p>
    </div>
  );
}

// Component แสดงรายละเอียดการจอง
function BookingDetails({ booking }: { booking: BookingData }) {
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          bg: 'bg-gradient-to-r from-yellow-400 to-orange-400',
          text: 'text-white',
          icon: <FiClock className="w-5 h-5" />,
          label: '🕒 ລໍຖ້າການອະນຸມັດ'
        };
      case 'approved':
        return {
          bg: 'bg-gradient-to-r from-green-400 to-emerald-400',
          text: 'text-white',
          icon: <FiCheck className="w-5 h-5" />,
          label: '✅ ອະນຸມັດແລ້ວ'
        };
      case 'rejected':
        return {
          bg: 'bg-gradient-to-r from-red-400 to-pink-400',
          text: 'text-white',
          icon: <FiX className="w-5 h-5" />,
          label: '❌ ຖືກປະຕິເສດ'
        };
      default:
        return {
          bg: 'bg-gray-400',
          text: 'text-white',
          icon: <FiAlertCircle className="w-5 h-5" />,
          label: 'ບໍ່ທາງການ'
        };
    }
  };

  const statusConfig = getStatusConfig(booking.payment_status);
  const canCancel = booking.can_cancel && booking.booking_status === 'active';
  const cancelDeadline = new Date(booking.can_cancel_until);
  const now = new Date();
  const timeLeft = Math.max(0, cancelDeadline.getTime() - now.getTime());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  const handleCancelBooking = async () => {
    try {
      setCancelling(true);
      
      // ใน production จะใช้ token จาก URL parameter
      const token = new URLSearchParams(window.location.search).get('token') || 'demo-token';
      
      const response = await fetch(`/api/bookings/${booking.booking_id}?token=${token}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('ຍົກເລີກການຈອງສຳເລັດ');
        window.location.reload();
      } else {
        toast.error(result.error || 'ເກີດຂໍ້ຜິດພາດ');
      }
    } catch (error) {
      console.error('Cancel booking error:', error);
      toast.error('ເກີດຂໍ້ຜິດພາດໃນລະບົບ');
    } finally {
      setCancelling(false);
      setShowCancelModal(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Status Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Status Header */}
        <div className={`${statusConfig.bg} px-8 py-6 ${statusConfig.text}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">ການຈອງ #{booking.booking_id}</h1>
              <div className="flex items-center space-x-4">
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  {statusConfig.icon}
                  <span className="ml-2">{statusConfig.label}</span>
                </span>
                <span className="text-opacity-80">
                  📅 ວັນທີ່ຈອງ: {new Date(booking.created_at).toLocaleDateString('lo-LA')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">₭{booking.total_price.toLocaleString()}</div>
              <div className="text-opacity-80">{booking.passenger_count} ຄົນ × ₭{(booking.total_price / booking.passenger_count).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Booking Details */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Customer Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ຂໍ້ມູນຜູ້ຈອງ</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">ຊື່:</span>
                  <span className="font-medium">{booking.customer_name}</span>
                </div>
              </div>
            </div>

            {/* Travel Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ຂໍ້ມູນການເດີນທາງ</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">ວັນທີ່ເດີນທາງ:</span>
                  <span className="font-medium">{new Date(booking.travel_date).toLocaleDateString('lo-LA')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ຈຳນວນຜູ້ໂດຍສານ:</span>
                  <span className="font-medium">{booking.passenger_count} ຄົນ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ປາຍທາງ:</span>
                  <span className="font-medium">{booking.destination}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes (if rejected) */}
          {booking.notes && booking.payment_status === 'rejected' && (
            <div className="border-t border-gray-200 mt-8 pt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ເຫດຜົນການປະຕິເສດ</h3>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-800">{booking.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">ຂັ້ນຕອນການຈອງ</h3>
        
        <div className="space-y-8">
          {/* Step 1: Completed */}
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <FiCheck className="w-5 h-5 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <h4 className="font-semibold text-gray-900">ສົ່ງການຈອງສຳເລັດ</h4>
              <p className="text-gray-600 text-sm">ການຈອງຂອງທ່ານໄດ້ຮັບແລ້ວ</p>
              <p className="text-green-600 text-xs font-medium mt-1">
                {new Date(booking.created_at).toLocaleString('lo-LA')}
              </p>
            </div>
          </div>

          {/* Step 2: Current Status */}
          <div className="flex items-start">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              booking.payment_status === 'pending' ? 'bg-yellow-500' :
              booking.payment_status === 'approved' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {booking.payment_status === 'pending' ? (
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              ) : booking.payment_status === 'approved' ? (
                <FiCheck className="w-5 h-5 text-white" />
              ) : (
                <FiX className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="ml-4 flex-1">
              <h4 className="font-semibold text-gray-900">
                {booking.payment_status === 'pending' && 'ກຳລັງກວດສອບການຊຳລະເງິນ'}
                {booking.payment_status === 'approved' && 'ການຊຳລະເງິນໄດ້ຮັບການອະນຸມັດ'}
                {booking.payment_status === 'rejected' && 'ການຊຳລະເງິນຖືກປະຕິເສດ'}
              </h4>
              <p className="text-gray-600 text-sm">
                {booking.payment_status === 'pending' && 'Admin ກຳລັງກວດສອບສະລິບການໂອນເງິນຂອງທ່ານ'}
                {booking.payment_status === 'approved' && 'ທ່ານຈະໄດ້ຮັບ QR Code ສຳລັບເດີນທາງ'}
                {booking.payment_status === 'rejected' && 'ກະລຸນາກວດສອບສະລິບແລະຈອງໃໝ່'}
              </p>
            </div>
          </div>

          {/* Step 3 & 4: Only show if approved */}
          {booking.payment_status === 'approved' && (
            <>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <FiCheck className="w-5 h-5 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="font-semibold text-gray-900">ໄດ້ຮັບ QR Code</h4>
                  <p className="text-gray-600 text-sm">ສຳລັບນຳໃຊ້ເດີນທາງ</p>
                </div>
              </div>

              <div className="flex items-start opacity-50">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-600">4</span>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="font-semibold text-gray-900">ເດີນທາງວັນທີ່ກຳນົດ</h4>
                  <p className="text-gray-600 text-sm">ນຳ QR Code ມາສະແກນກັບຄົນຂັບ</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">ການກະທຳ</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cancel Button */}
          {canCancel && booking.payment_status === 'pending' && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center justify-center px-6 py-3 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
            >
              <FiX className="w-5 h-5 mr-2" />
              ຍົກເລີກການຈອງ
            </button>
          )}

          {/* Contact Button */}
          <button className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors">
            <FiMessageCircle className="w-5 h-5 mr-2" />
            ຕິດຕໍ່ Admin
          </button>
        </div>

        {/* Cancel Warning */}
        {canCancel && timeLeft > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-start">
              <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h4 className="font-medium text-yellow-800">ຂໍ້ມູນການຍົກເລີກ</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  ທ່ານສາມາດຍົກເລີກການຈອງໄດ້ອີກ <strong>{hoursLeft} ຊົ່ວໂມງ {minutesLeft} ນາທີ</strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">ຢືນຢັນການຍົກເລີກ</h3>
              <p className="text-gray-600 mb-6">ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການຍົກເລີກການຈອງນີ້?</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
                >
                  ກັບຄືນ
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling ? 'ກຳລັງຍົກເລີກ...' : 'ຢືນຢັນຍົກເລີກ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main component ที่รองรับทั้งสองโหมด
function BookingStatusPageContent() {
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ตรวจสอบว่ามี token ใน URL หรือไม่
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      fetchBookingStatus(token);
    }
  }, [token]);

  const fetchBookingStatus = async (token: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/bookings/status?token=${token}`);
      const result = await response.json();

      if (result.success) {
        setBooking(result.booking);
      } else {
        setError(result.error || 'ບໍ່ພົບຂໍ້ມູນການຈອງ');
      }
    } catch (error) {
      console.error('Fetch booking status error:', error);
      setError('ເກີດຂໍ້ຜິດພາດໃນລະບົບ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">BusBooking</h1>
                <p className="text-xs text-gray-500">
                  {booking ? 'ສະຖານະການຈອງ' : 'ເຊັກສະຖານະ'}
                </p>
              </div>
            </div>
            <a href="/booking" className="text-purple-600 hover:text-purple-700 font-medium">
              ← ກັບໄປຈອງໃໝ່
            </a>
          </div>
        </div>
      </header>

      <main className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-600">ກຳລັງໂຫລດຂໍ້ມູນ...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">ເກີດຂໍ້ຜິດພາດ</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
              >
                <FiRefreshCw className="mr-2" />
                ລອງໃໝ່
              </button>
            </div>
          ) : booking ? (
            <BookingDetails booking={booking} />
          ) : (
            // Form สำหรับส่งลิงก์เช็คสถานะ
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">ເຊັກສະຖານະການຈອງ</h2>
              <p className="text-gray-600 mb-8">ໃສ່ເບີໂທລະສັບເພື່ອເຊັກສະຖານະການຈອງຂອງທ່ານ</p>
              
              <StatusChecker />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Main exported component with Suspense wrapper
export default function BookingStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">ກຳລັງໂຫລດ...</p>
        </div>
      </div>
    }>
      <BookingStatusPageContent />
    </Suspense>
  );
}