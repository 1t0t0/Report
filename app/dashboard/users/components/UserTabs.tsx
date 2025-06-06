// app/dashboard/users/components/UserTabs.tsx - ลบวงกลม count ออก
import React from 'react';
import { useSession } from 'next-auth/react';

interface UserTabsProps {
  activeTab: 'drivers' | 'staff' | 'admin' | 'station';
  onTabChange: (tab: 'drivers' | 'staff' | 'admin' | 'station') => void;
  shouldShowTab: (tab: 'drivers' | 'staff' | 'admin' | 'station') => boolean;
}

const UserTabs: React.FC<UserTabsProps> = ({ activeTab, onTabChange, shouldShowTab }) => {
  const { data: session } = useSession();
  
  const tabs = [
    { key: 'drivers', label: 'ຄົນຂັບລົດ' },
    { key: 'staff', label: 'ພະນັກງານຂາຍປີ້' },
    { key: 'admin', label: 'ແອດມິນ' },
    { key: 'station', label: 'ສະຖານີ' }
  ];
  
  // Filter tabs based on user role
  const visibleTabs = tabs.filter(tab => {
    if (session?.user?.role === 'admin') {
      return true; // Admin sees all tabs
    } else if (session?.user?.role === 'staff') {
      return tab.key === 'drivers'; // Staff sees only drivers tab
    }
    return shouldShowTab(tab.key as any);
  });
  
  return (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {visibleTabs.map(tab => {
            const isActive = activeTab === tab.key;
            
            return (
              <button
                key={tab.key}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => onTabChange(tab.key as any)}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default UserTabs;