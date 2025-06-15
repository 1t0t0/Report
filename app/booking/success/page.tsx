// app/booking/success/page.tsx - Payment Success Page
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface BookingInfo {
  booking_id: string;
  payment_status: string;
  booking_status: string;
  qr_code_sent: boolean;
  travel_date: string;
  passenger_count: number;
  total_price: number;
  contact_name: string;
  contact_email: string;
}

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkBookingStatus = async () => {
      try {
        // Get booking_id from URL params or localStorage
        let booking_id = searchParams?.get('booking_id');
        
        if (!booking_id) {
          booking_id = localStorage.getItem('pending_booking_id');
          localStorage.removeItem('pending_booking_id'); // Clean up
        }

        if (!booking_id) {
          setError('ບໍ່ພົບຂໍ້ມູນການຊຳລະ');
          return;
        }

        // Check payment status
        const response = await fetch(`/api/booking/payment?booking_id=${booking_id}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to check booking status');
        }

        setBookingInfo(result.booking);

      } catch (error) {
        console.error('Error checking booking status:', error);
        setError(error instanceof Error ? error.message : 'ເກີດຂໍ້ຜິດພາດ');
      } finally {
        setLoading(false);
      }
    };

    checkBookingStatus();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">ກຳລັງກວດສອບສະຖານະການຊຳລະ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">ເກີດຂໍ້ຜິດພາດ</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/booking"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            ລອງໃໝ່
          </Link>
        </div>
      </div>
    );
  }

  const isPaymentSuccessful = bookingInfo?.payment_status === 'paid';

  return (
    <div className={`min-h-screen ${isPaymentSuccessful ? 'bg-gradient-to-br from-green-50 to-blue-50' : 'bg-gradient-to-br from-yellow-50 to-orange-50'} flex items-center justify-center p-4`}>
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
        
        {isPaymentSuccessful ? (
          // Success State
          <>
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">
                🎉 ຊຳລະເງິນສຳເລັດ!
              </h1>
              <p className="text-gray-600">
                ການຈອງຂອງທ່ານໄດ້ຮັບການຢືນຢັນແລ້ວ
              </p>
            </div>

            {bookingInfo && (
              <div className="space-y-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3">📋 ລາຍລະອຽດການຈອງ</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">ລະຫັດການຈອງ:</span>
                      <span className="font-mono font-semibold text-green-800">{bookingInfo.booking_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">ວັນທີເດີນທາງ:</span>
                      <span className="text-green-800">
                        {new Date(bookingInfo.travel_date).toLocaleDateString('lo-LA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">ຈຳນວນຜູ້ໂດຍສານ:</span>
                      <span className="text-green-800">{bookingInfo.passenger_count} ຄົນ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">ລາຄາລວມ:</span>
                      <span className="font-semibold text-green-800">₭{bookingInfo.total_price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-2">📧 QR Code</h3>
                  {bookingInfo.qr_code_sent ? (
                    <div className="text-sm text-blue-700">
                      <p className="mb-1">✅ QR Code ຖືກສົ່ງໄປທີ່ອີເມວແລ້ວ:</p>
                      <p className="font-mono bg-blue-100 px-2 py-1 rounded">{bookingInfo.contact_email}</p>
                    </div>
                  ) : (
                    <div className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
                      ⏳ ກຳລັງສົ່ງ QR Code ໄປທີ່ອີເມວ...
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="font-semibold text-yellow-800 mb-2">⚠️ ຂໍ້ສຳຄັນ</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• ກະລຸນາມາກ່ອນເວລາເດີນທາງ 15 ນາທີ</li>
                    <li>• ເອົາ QR Code ມາໃຫ້ພະນັກງານສະແກນ</li>
                    <li>• ສາມາດຍົກເລີກໄດ້ພາຍໃນ 24 ຊົ່ວໂມງ</li>
                    <li>• ຕິດຕໍ່: 020-1234-5678</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/booking"
                className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
              >
                ຈອງອີກຄັ້ງ
              </Link>
              <Link
                href="/"
                className="block w-full text-center border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition"
              >
                ກັບໄປໜ້າຫຼັກ
              </Link>
            </div>
          </>
        ) : (
          // Pending/Processing State
          <>
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⏳</span>
              </div>
              <h1 className="text-2xl font-bold text-yellow-600 mb-2">
                ກຳລັງດຳເນີນການ
              </h1>
              <p className="text-gray-600">
                ການຊຳລະຂອງທ່ານກຳລັງຖືກດຳເນີນການ
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
              <p className="text-sm text-yellow-700">
                ກະລຸນາລໍຖ້າສັກຄູ່ ຫຼື ກວດສອບອີເມວຂອງທ່ານ
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition"
            >
              ອັບເດດສະຖານະ
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// app/booking/cancel/page.tsx - Payment Cancel Page
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function BookingCancelPage() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Clean up localStorage
    localStorage.removeItem('pending_booking_id');
  }, []);

  const booking_id = searchParams?.get('booking_id');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">❌</span>
        </div>
        
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          ການຊຳລະຖືກຍົກເລີກ
        </h1>
        
        <p className="text-gray-600 mb-6">
          ທ່ານໄດ້ຍົກເລີກການຊຳລະເງິນ ການຈອງຂອງທ່ານຈະບໍ່ໄດ້ຮັບການຢືນຢັນ
        </p>

        {booking_id && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-600">
              ລະຫັດການຈອງ: <span className="font-mono">{booking_id}</span>
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/booking"
            className="block w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            ຈອງໃໝ່
          </Link>
          <Link
            href="/"
            className="block w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition"
          >
            ກັບໄປໜ້າຫຼັກ
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            ຫາກທ່ານມີຄຳຖາມ ກະລຸນາຕິດຕໍ່: <br />
            <a href="tel:020-1234-5678" className="text-blue-600 hover:underline">
              020-1234-5678
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}