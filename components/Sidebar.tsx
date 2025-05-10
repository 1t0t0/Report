'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Menu items สำหรับแต่ละบทบาท
const menuItems = {
  admin: [
    { name: 'Dashboard', href: '/dashboard', exact: true },
    { name: 'Tickets Sales', href: '/dashboard/tickets', exact: true },
    { name: 'Tickets Info', href: '/dashboard/tickets/history', exact: false }, 
    { name: 'User Management', href: '/dashboard/users', exact: false },
    { name: 'Cars', href: '/dashboard/cars', exact: false }, // เพิ่ม Menu Cars
    { name: 'Revenue Sharing', href: '/dashboard/revenue', exact: false },
  ],
  staff: [
    { name: 'Tickets Sales', href: '/dashboard/tickets', exact: true },
    { name: 'Tickets Info', href: '/dashboard/tickets/history', exact: false },
    { name: 'User Management', href: '/dashboard/users', exact: false },
    { name: 'Cars', href: '/dashboard/cars', exact: false }, // เพิ่ม Menu Cars
  ],
  driver: [
    { name: 'My Income', href: '/driver-portal', exact: true },
  ],
  station: [
    { name: 'Dashboard', href: '/dashboard', exact: true },
    { name: 'Tickets Info', href: '/dashboard/tickets/history', exact: false },
    { name: 'Revenue Sharing', href: '/dashboard/revenue', exact: false },
  ]
};

export default function NotionSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // เลือก navigation items ตามบทบาทของผู้ใช้
  const navigation = session?.user?.role ? menuItems[session.user.role as keyof typeof menuItems] || [] : [];

  // ฟังก์ชันสำหรับตรวจสอบว่าลิงก์ใดกำลัง active
  const isActiveLink = (href: string, exact: boolean) => {
    if (exact) {
      // ตรงกันแบบ exact เท่านั้น
      return pathname === href;
    } else {
      // ตรงกันแบบ prefix
      return pathname.startsWith(href);
    }
  };

  return (
    <div className="hidden md:block md:w-60 md:fixed md:inset-y-0">
      <div className="flex flex-col h-full bg-[#F7F6F3] border-r border-[#E9E9E8]">
        <div className="flex items-center h-16 px-6 border-b border-[#E9E9E8]">
          <h1 className="text-[#37352F] font-medium text-base">Bus Ticket System</h1>
        </div>
        <div className="flex-1 pt-5 pb-4 px-3 overflow-y-auto">
          <nav className="space-y-2">
            {navigation.map((item) => {
              const active = isActiveLink(item.href, item.exact);
              
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`
                    block w-full px-3 py-2.5 text-sm rounded transition-colors
                    ${active 
                      ? 'bg-[#EFEFEF] text-[#37352F] font-medium' 
                      : 'text-[#6B6B6B] hover:bg-[#EFEFEF]'
                    }
                  `}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}