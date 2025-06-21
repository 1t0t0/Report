'use client'
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  FiCalendar,
  FiUsers, 
  FiDollarSign, 
  FiClock,
  FiCheck,
  FiX,
  FiEye,
  FiRefreshCw,
  FiFilter,
  FiDownload,
  FiSearch,
  FiMapPin,
  FiPhone,
  FiMail,
  FiImage
} from 'react-icons/fi';

interface BookingData {
  _id: string;
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  travel_date: string;
  passenger_count: number;
  destination: string;
  total_price: number;
  payment_status: 'pending' | 'approved' | 'rejected';
  booking_status: 'active' | 'cancelled';
  payment_slip_url: string;
  created_at: string;
  notes?: string;
  can_cancel: boolean;
  can_cancel_until: string;
}

interface StatsData {
  todayBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  totalRevenue: number;
  totalPassengers: number;
}

const AdminBookingsPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Check authentication
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !['admin', 'staff'].includes(session.user.role)) {
      router.push('/login');
      return;
    }
    fetchBookings();
  }, [session, status, router, statusFilter, dateFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter) params.append('date', dateFilter);
      
      const response = await fetch(`/api/bookings?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.bookings || []);
        setStats(data.stats || null);
      } else {
        console.error('Failed to fetch bookings:', data.error);
      }
    } catch (error) {
      console.error('Fetch bookings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchBookings(); // Refresh data
        setShowModal(false);
        setSelectedBooking(null);
        
        // Show success message
        alert(action === 'approve' ? 'อนุมัติการจองสำเร็จ!' : 'ปฏิเสธการจองสำเร็จ!');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Action error:', error);
      alert('เกิดข้อผิดพลาดในระบบ');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter bookings based on search term
  const filteredBookings = bookings.filter(booking => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      booking.booking_id.toLowerCase().includes(search) ||
      booking.customer_name.toLowerCase().includes(search) ||
      booking.customer_phone.includes(search) ||
      booking.customer_email.toLowerCase().includes(search) ||
      booking.destination.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800', 
        label: '⏳ ລໍຖ້າການອະນຸມັດ',
        icon: <FiClock className="w-3 h-3 mr-1" />
      },
      approved: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        label: '✅ ອະນຸມັດແລ້ວ',
        icon: <FiCheck className="w-3 h-3 mr-1" />
      },
      rejected: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        label: '❌ ປະຕິເສດ',
        icon: <FiX className="w-3 h-3 mr-1" />
      }
    };
    
    const config = configs[status as keyof typeof configs] || configs.pending;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('lo-LA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₭${amount.toLocaleString()}`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">ກຳລັງໂຫລດ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <FiCalendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ຈັດການການຈອງ</h1>
                <p className="text-xs text-gray-500">ລະບົບອອກປີ້ລົດຕູ້ໂດຍສານ</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchBookings}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="text-sm text-gray-600">
                {session?.user?.name || session?.user?.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <FiCalendar className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ວັນນີ້</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayBookings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <FiClock className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ລໍຖ້າການອະນຸມັດ</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingBookings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <FiCheck className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ອະນຸມັດແລ້ວ</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approvedBookings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <FiUsers className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ຜູ້ໂດຍສານ</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPassengers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <FiDollarSign className="h-8 w-8 text-emerald-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ລາຍຮັບ</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="ຄົ້ນຫາຕາມເລກທີ່, ຊື່, ເບີໂທ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-80"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <FiFilter className="w-4 h-4 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">ທຸກສະຖານະ</option>
                  <option value="pending">ລໍຖ້າການອະນຸມັດ</option>
                  <option value="approved">ອະນຸມັດແລ້ວ</option>
                  <option value="rejected">ປະຕິເສດ</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center space-x-2">
                <FiCalendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Export Button */}
            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <FiDownload className="w-4 h-4 mr-2" />
              ນຳອອກຂໍ້ມູນ
            </button>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              ການຈອງທັງໝົດ ({filteredBookings.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ເລກທີ່ການຈອງ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ລູກຄ້າ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ວັນທີ່ເດີນທາງ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ຜູ້ໂດຍສານ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ລາຄາ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ສະຖານະ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ວັນທີ່ຈອງ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ການຈັດການ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.booking_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.customer_name}</div>
                      <div className="text-sm text-gray-500">{booking.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(booking.travel_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {booking.passenger_count} ຄົນ
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(booking.total_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(booking.payment_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(booking.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center transition-colors"
                      >
                        <FiEye className="w-4 h-4 mr-1" />
                        ດູລາຍລະອຽດ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredBookings.length === 0 && (
              <div className="text-center py-12">
                <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">ບໍ່ມີການຈອງ</h3>
                <p className="mt-1 text-sm text-gray-500">ບໍ່ມີການຈອງທີ່ຕົງກັບເງື່ອນໄຂການຄົ້ນຫາ</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                ລາຍລະອຽດການຈອງ #{selectedBooking.booking_id}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Customer Info */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FiUsers className="w-5 h-5 mr-2 text-blue-500" />
                    ຂໍ້ມູນລູກຄ້າ
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center">
                      <FiUsers className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-500 w-20">ຊື່:</span>
                      <span className="font-medium">{selectedBooking.customer_name}</span>
                    </div>
                    <div className="flex items-center">
                      <FiPhone className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-500 w-20">ເບີໂທ:</span>
                      <span className="font-medium">{selectedBooking.customer_phone}</span>
                    </div>
                    <div className="flex items-center">
                      <FiMail className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-500 w-20">ອີເມລ:</span>
                      <span className="font-medium">{selectedBooking.customer_email}</span>
                    </div>
                  </div>
                </div>

                {/* Travel Info */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FiMapPin className="w-5 h-5 mr-2 text-green-500" />
                    ຂໍ້ມູນການເດີນທາງ
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center">
                      <FiCalendar className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-500 w-24">ວັນທີ່ເດີນທາງ:</span>
                      <span className="font-medium">{formatDate(selectedBooking.travel_date)}</span>
                    </div>
                    <div className="flex items-center">
                      <FiUsers className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-500 w-24">ຜູ້ໂດຍສານ:</span>
                      <span className="font-medium">{selectedBooking.passenger_count} ຄົນ</span>
                    </div>
                    <div className="flex items-start">
                      <FiMapPin className="w-4 h-4 text-gray-500 mr-2 mt-0.5" />
                      <span className="text-sm text-gray-500 w-24">ປາຍທາງ:</span>
                      <span className="font-medium">{selectedBooking.destination}</span>
                    </div>
                  </div>
                </div>

                {/* Booking Info */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FiCalendar className="w-5 h-5 mr-2 text-purple-500" />
                    ຂໍ້ມູນການຈອງ
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-24">ວັນທີ່ຈອງ:</span>
                      <span className="font-medium">{formatDate(selectedBooking.created_at)}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 w-24">ສະຖານະ:</span>
                      {getStatusBadge(selectedBooking.payment_status)}
                    </div>
                    {selectedBooking.can_cancel && (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 w-24">ຍົກເລີກໄດ້ຮອດ:</span>
                        <span className="font-medium text-sm">
                          {new Date(selectedBooking.can_cancel_until).toLocaleString('lo-LA')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Payment Info */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FiDollarSign className="w-5 h-5 mr-2 text-emerald-500" />
                    ຂໍ້ມູນການຊຳລະເງິນ
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">ລາຄາຕໍ່ຄົນ:</span>
                      <span className="font-medium">{formatCurrency(selectedBooking.total_price / selectedBooking.passenger_count)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">ຈຳນວນຄົນ:</span>
                      <span className="font-medium">{selectedBooking.passenger_count} ຄົນ</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="font-medium text-gray-900">ລາຄາລວມ:</span>
                      <span className="font-bold text-lg text-emerald-600">
                        {formatCurrency(selectedBooking.total_price)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Payment Slip */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FiImage className="w-5 h-5 mr-2 text-blue-500" />
                    ສະລິບການໂອນເງິນ
                  </h4>
                  {selectedBooking.payment_slip_url ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <img 
                        src={selectedBooking.payment_slip_url} 
                        alt="Payment Slip" 
                        className="w-full h-64 object-contain bg-gray-50"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="100" y="100" text-anchor="middle" dy="0.3em" font-family="sans-serif" font-size="14" fill="%236b7280">ບໍ່ສາມາດໂຫລດຮູບພາບໄດ້</text></svg>';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
                      <FiImage className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-gray-500">ບໍ່ມີສະລິບການໂອນເງິນ</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {selectedBooking.notes && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">ໝາຍເຫດ</h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800">{selectedBooking.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {selectedBooking.payment_status === 'pending' && (
              <div className="flex space-x-3 pt-8 border-t mt-8">
                <button
                  onClick={() => handleBookingAction(selectedBooking._id, 'approve')}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  {actionLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <FiCheck className="w-5 h-5 mr-2" />
                      ອະນຸມັດການຈອງ
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const notes = prompt('ເຫດຜົນໃນການປະຕິເສດ:');
                    if (notes) {
                      handleBookingAction(selectedBooking._id, 'reject', notes);
                    }
                  }}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  <FiX className="w-5 h-5 mr-2" />
                  ປະຕິເສດການຈອງ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingsPage;