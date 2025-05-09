'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NeoCard from '@/components/ui/NotionCard';
import NeoButton from '@/components/ui/NotionButton';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import useConfirmation from '@/hooks/useConfirmation';

// ตั้งค่า
import { TABS } from './config/constants';

// Components
import { UserTabs } from './components';
import { DriverList, StaffList, AdminList, StationList } from './components/lists';
import AddUserModal from './components/AddUserModal';

// Hooks
import useUserData from './hooks/useUserData';
import useUserPermissions from './hooks/useUserPermissions';

export default function UserManagementPage() {
  // Hooks
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    isConfirmDialogOpen,
    confirmMessage,
    showConfirmation,
    handleConfirm,
    handleCancel
  } = useConfirmation();

  // State - UI
  const [activeTab, setActiveTab] = useState<'drivers' | 'staff' | 'admin' | 'station'>('drivers');
  const [showAddModal, setShowAddModal] = useState(false);

  // Custom hooks
  const { loading, drivers, ticketSellers, admins, stations, fetchUsers } = useUserData();
  const { canAddUser, shouldShowTab } = useUserPermissions();

  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !['admin', 'staff'].includes(session?.user?.role || '')) {
      router.push('/dashboard');
    }
  }, [status, router, session]);
  
  // Initial data fetch
  useEffect(() => {
    if (status === 'authenticated' && ['admin', 'staff'].includes(session?.user?.role || '')) {
      fetchUsers();
    }
  }, [status, session, fetchUsers]);

  // Tab change handler
  const handleTabChange = (tab: 'drivers' | 'staff' | 'admin' | 'station') => {
    setActiveTab(tab);
  };

  // Render users based on active tab
  const renderUsersList = () => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <p>ກຳລັງໂຫລດ...</p>
        </div>
      );
    }

    switch(activeTab) {
      case 'drivers':
        return <DriverList drivers={drivers} showConfirmation={showConfirmation} />;
      case 'staff':
        return <StaffList staff={ticketSellers} showConfirmation={showConfirmation} />;
      case 'admin':
        return <AdminList admins={admins} showConfirmation={showConfirmation} />;
      case 'station':
        return <StationList stations={stations} showConfirmation={showConfirmation} />;
      default:
        return null;
    }
  };

  // Main render
  if (status === 'unauthenticated' || (status === 'authenticated' && !['admin', 'staff'].includes(session?.user?.role || ''))) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ຈັດການຜູ້ໃຊ້ລະບົບ</h1>
        {canAddUser() && (
          <NeoButton onClick={() => setShowAddModal(true)}>
            ເພີ່ມຜູ້ໃຊ້ລະບົບ
          </NeoButton>
        )}
      </div>
      
      <NeoCard className="overflow-hidden mb-6">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">User Directory</h2>
          
          <UserTabs 
            activeTab={activeTab} 
            onTabChange={handleTabChange} 
            shouldShowTab={shouldShowTab}
          />
          
          <div>{renderUsersList()}</div>
        </div>
      </NeoCard>
      
      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          activeTab={activeTab}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchUsers}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog 
        isOpen={isConfirmDialogOpen}
        message={confirmMessage}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}