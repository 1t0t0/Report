// components/DashboardLayout.tsx - อัพเดท paths และเพิ่มเมนู Settings
'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  FiHome, 
  FiUsers, 
  FiBarChart, 
  FiLogOut, 
  FiMenu, 
  FiX,
  FiPieChart,
  FiLogIn,
  FiCalendar,
  FiSettings  // ✅ เพิ่ม Settings icon
} from 'react-icons/fi';
import { TbBus } from "react-icons/tb";
import { Ticket } from 'lucide-react';
import GoogleAlphabetIcon from '@/components/GoogleAlphabetIcon';
import notificationService from '@/lib/notificationService';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[];
  description?: string;
}

const menuItems: MenuItem[] = [
  {
    name: 'ໜ້າຫຼັກ',
    href: '/dashboard',
    icon: FiHome,
    roles: ['admin'],
    description: 'ພາບລວມຂໍ້ມູນສະຖິຕິ'
  },
  // ✅ อัพเดท path ให้ตรงกับที่มีอยู่
  {
    name: 'ຈັດການການຈອງ',
    href: '/admin/bookings',  // ✅ ใช้ path เดิมที่มีอยู่
    icon: FiCalendar,
    roles: ['admin'],
    description: 'ອະນຸມັດ/ປະຕິເສດການຈອງ'
  },
  {
    name: 'ອອກປີ້',
    href: '/dashboard/tickets',
    icon: Ticket,
    roles: ['admin', 'staff'],
    description: 'ຂາຍແລະຈັດການປີ້'
  },
  {
    name: 'ປະຫວັດປີ້',
    href: '/dashboard/tickets/history',
    icon: FiBarChart,
    roles: ['admin', 'staff'],
    description: 'ເບິ່ງປະຫວັດການຂາຍ'
  },
  {
    name: 'ຈັດການຜູ້ໃຊ້',
    href: '/dashboard/users',
    icon: FiUsers,
    roles: ['admin', 'staff'],
    description: 'ຄົນຂັບ, ພະນັກງານ, Admin'
  },
  
  {
    name: 'ລາຍງານ',
    href: '/dashboard/reports',
    icon: FiPieChart,
    roles: ['admin', 'staff', 'station'],
    description: 'ລາຍງານແລະສະຖິຕິ'
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userImageError, setUserImageError] = useState(false);
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [userCheckInStatus, setUserCheckInStatus] = useState<'checked-in' | 'checked-out'>('checked-out');
  const [checkingInOut, setCheckingInOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // รีเซ็ต image error เมื่อ user เปลี่ยน
  useEffect(() => {
    setUserImageError(false);
  }, [session?.user?.id]);

  // ดึงข้อมูลรูปภาพผู้ใช้และสถานะ check-in จากฐานข้อมูล
  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/users/${session.user.id}`);
          if (response.ok) {
            const userData = await response.json();
            setUserProfileImage(userData.userImage || null);
            setUserCheckInStatus(userData.checkInStatus || 'checked-out');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserProfileImage(null);
          setUserCheckInStatus('checked-out');
        }
      } else {
        setUserProfileImage(null);
        setUserCheckInStatus('checked-out');
      }
    };

    fetchUserData();
  }, [session?.user?.id]);

  // ฟังก์ชัน check-in/check-out
  const handleCheckInOut = async () => {
    if (!session?.user?.id) return;

    try {
      setCheckingInOut(true);
      
      const newStatus = userCheckInStatus === 'checked-in' ? 'checked-out' : 'checked-in';
      const action = newStatus === 'checked-in' ? 'check-in' : 'check-out';
      
      // อัพเดท check-in status
      const response = await fetch(`/api/users/${session.user.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkInStatus: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update check-in status');
      }

      // บันทึก WorkLog
      try {
        await fetch(`/api/work-logs/user/${session.user.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
      } catch (logError) {
        console.error('Failed to log work action:', logError);
      }

      // อัพเดทสถานะ
      setUserCheckInStatus(newStatus);
      
      // แสดงข้อความแจ้งเตือน
      notificationService.success(
        action === 'check-in' ? 'ເຊັກອິນສຳເລັດແລ້ວ' : 'ເຊັກເອົາສຳເລັດແລ້ວ'
      );
      
    } catch (error: any) {
      console.error('Error updating check-in status:', error);
      notificationService.error(`ເກີດຂໍ້ຜິດພາດ: ${error.message}`);
    } finally {
      setCheckingInOut(false);
    }
  };

  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F6F3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>ກຳລັງໂຫລດ...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const userRole = session?.user?.role;
  const userName = session?.user?.name || 'User';
  
  // ใช้รูปภาพจากฐานข้อมูลแทน session.user.image
  const userImage = userProfileImage || session?.user?.image;
  
  // ตรวจสอบว่ามีรูปภาพที่ใช้งานได้หรือไม่
  const hasValidUserImage = userImage && 
                           typeof userImage === 'string' && 
                           userImage.trim() !== '' &&
                           (userImage.startsWith('http') || userImage.startsWith('data:')) &&
                           !userImageError;
                           
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole || '')
  );

  const handleUserImageError = () => {
    setUserImageError(true);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <TbBus className="h-8 w-8 text-blue-600 mr-2" />
            <span className="text-lg font-bold text-gray-800">Bus Ticket</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center">
            <div className="mr-3">
              {hasValidUserImage ? (
                <img 
                  src={userImage} 
                  alt={userName} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-white"
                  onError={handleUserImageError}
                />
              ) : (
                <GoogleAlphabetIcon 
                  name={userName} 
                  size="lg"
                />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{userName}</p>
              <p className="text-xs text-blue-600 capitalize">
                {userRole === 'admin' ? 'ຜູ້ບໍລິຫານ' : 
                 userRole === 'staff' ? 'ພະນັກງານ' : 
                 userRole === 'station' ? 'ສະຖານີ' : 
                 userRole === 'driver' ? 'ຄົນຂັບລົດ' : userRole}
              </p>
              {/* แสดงสถานะ check-in เฉพาะ staff */}
              {userRole === 'staff' && (
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                    userCheckInStatus === 'checked-in' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {userCheckInStatus === 'checked-in' ? 'ເຂົ້າວຽກ' : 'ອອກວຽກ'}
                  </span>
                </div>
              )}
            </div>
            
            {/* ปุ่ม Check-in/out เฉพาะ staff - วางตรงกลาง */}
            {userRole === 'staff' && (
              <div className="ml-3">
                <button
                  onClick={handleCheckInOut}
                  disabled={checkingInOut}
                  className={`p-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center ${
                    userCheckInStatus === 'checked-in' 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={checkingInOut ? 'ກຳລັງປະມວນຜົນ...' : (userCheckInStatus === 'checked-in' ? 'ອອກວຽກ' : 'ເຂົ້າວຽກ')}
                >
                  {checkingInOut ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <FiLogIn size={16} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-2">
          {filteredMenuItems.map((item) => {
            // ✅ ปรับปรุงการตรวจสอบ active state
            const isActive = pathname === item.href || 
                            // ถ้าเป็น /dashboard/admin จะ highlight เมื่ออยู่ที่ /dashboard/admin/*
                            (item.href === '/dashboard/admin' && pathname.startsWith('/dashboard/admin')) ||
                            // ถ้าเป็น /admin/settings จะ highlight เมื่ออยู่ที่ /admin/settings/*
                            (item.href === '/admin/settings' && pathname.startsWith('/admin/settings'));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 mb-1 text-sm font-medium rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon 
                  className={`mr-3 h-5 w-5 ${
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                  }`} 
                />
                <div className="flex-1">
                  <div>{item.name}</div>
                  {item.description && (
                    <div className={`text-xs mt-0.5 ${
                      isActive ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {item.description}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <FiLogOut className="mr-3 h-5 w-5" />
            ອອກຈາກລະບົບ
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiMenu className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              <TbBus className="h-6 w-6 text-blue-600 mr-2" />
              <span className="font-bold text-gray-800">Bus Ticket</span>
            </div>
            <div className="w-6 h-6"></div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}