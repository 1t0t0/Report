// แก้ไขไฟล์ app/dashboard/users/components/UserCard.tsx

import React, { useState } from 'react';
import { 
  FiMail, 
  FiPhone, 
  FiEdit2, 
  FiTrash2, 
  FiUser, 
  FiHome, 
  FiMapPin, 
  FiLogIn, 
  FiLogOut,
  FiEye // เพิ่ม import icon ตา สำหรับปุ่ม View
} from 'react-icons/fi';
import NeoButton from '@/components/ui/NotionButton';

import { User } from '../types';
import useUserPermissions from '../hooks/useUserPermissions';
import useCheckInOut from '../hooks/useCheckinOut';
import EditUserModal from './EditUserModal';
import ViewUserModal from './ViewUserModal'; // เพิ่ม import ViewUserModal

interface UserCardProps {
 user: User;
 admins?: User[];
 onDelete: (userId: string, role: string, name: string) => void;
 onRefresh: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ 
 user, 
 admins = [],
 onDelete,
 onRefresh
}) => {
 const { canShowCheckInOutButton, canEditUser, canDeleteUser } = useUserPermissions();
 const { checkingInOut, handleCheckInOut } = useCheckInOut(onRefresh);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showViewModal, setShowViewModal] = useState(false); // เพิ่ม state สำหรับ View modal
 const [imageError, setImageError] = useState(false);

 const isDriver = user.role === 'driver';
 const isStaffUser = user.role === 'staff';
 const isStation = user.role === 'station';
 const showCheckInOut = canShowCheckInOutButton(user);
 const showEditButton = canEditUser(user);
 const showDeleteButton = canDeleteUser(user) && !(user.role === 'admin' && admins.length <= 1);
 
 // ปรับปรุงการตรวจสอบ userImage
 const hasValidImage = user && user.userImage && 
                       typeof user.userImage === 'string' && 
                       (user.userImage.startsWith('http') || 
                        user.userImage.startsWith('data:')) &&
                       !imageError;
 
 // เมื่อมีข้อผิดพลาดในการโหลดรูปภาพ
 const handleImageError = () => {
   setImageError(true);
 };
 
 // Get appropriate CSS classes based on user role
 const getRoleClasses = () => {
   if (isDriver) return { bg: 'bg-blue-100', text: 'text-blue-500' };
   if (isStation) return { bg: 'bg-yellow-100', text: 'text-yellow-500' };
   if (isStaffUser) return { bg: 'bg-green-100', text: 'text-green-500' };
   return { bg: 'bg-purple-100', text: 'text-purple-500' };
 };
 
 const { bg, text } = getRoleClasses();
 
 return (
   <>
     <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
       <div className="p-4 flex flex-wrap items-center">
         {/* Avatar */}
         <div className={`w-12 h-12 ${bg} rounded-full flex items-center justify-center mr-4 overflow-hidden`}>
           {hasValidImage ? (
             <img 
               src={user.userImage!} 
               alt={user.name} 
               className="w-full h-full object-cover"
               onError={handleImageError}
             />
           ) : (
             <FiUser size={24} className={text} />
           )}
         </div>
         
         {/* User main info */}
         <div className="flex-1 min-w-0">
           <div className="text-lg font-semibold truncate">{user.name}</div>
           
           {/* IDs */}
           {isDriver && user.employeeId && (
             <div className="text-sm text-gray-500">ID: {user.employeeId}</div>
           )}
           {isStaffUser && user.employeeId && (
             <div className="text-sm text-gray-500">ID: {user.employeeId}</div>
           )}
           {isStation && user.stationId && (
             <div className="text-sm text-gray-500">ID: {user.stationId}</div>
           )}
           
           {/* Location for stations */}
           {isStation && user.location && (
             <div className="text-sm text-gray-500">
               <FiMapPin size={14} className="inline mr-1" />
               {user.location}
             </div>
           )}
           
           {/* Check-in status badge */}
           {(isDriver || isStaffUser) && (
             <div className="mt-1">
               <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                 user.checkInStatus === 'checked-in' 
                   ? 'bg-green-100 text-green-800 border border-green-200' 
                   : 'bg-red-100 text-red-800 border border-red-200'
               }`}>
                 {user.checkInStatus === 'checked-in' ? 'ໄດ້ເຂົ້າວຽກແລ້ວ' : 'ຍັງບໍ່ໄດ້ເຂົ້າວຽກ'}
               </span>
             </div>
           )}
         </div>
         
         {/* Contact info */}
         <div className="flex items-center space-x-4 mr-4 flex-wrap">
           <div className="flex items-center m-2">
             <FiMail size={18} className="text-gray-400 mr-2" />
             <span>{user.email}</span>
           </div>
           
           {user.phone && (
             <div className="flex items-center m-2">
               <FiPhone size={18} className="text-gray-400 mr-2" />
               <span>{user.phone}</span>
             </div>
           )}
           
           {isStation && user.stationName && (
             <div className="flex items-center m-2">
               <FiHome size={18} className="text-gray-400 mr-2" />
               <span>{user.stationName}</span>
             </div>
           )}
         </div>
         
         {/* Action buttons */}
         <div className="flex space-x-2 flex-wrap">
           {showCheckInOut && (
             <div className="m-1">
               <NeoButton
                 variant={user.checkInStatus === 'checked-in' ? 'danger' : 'success'}
                 size="sm"
                 onClick={() => handleCheckInOut(user._id!, user.checkInStatus || 'checked-out')}
                 disabled={checkingInOut[user._id!]}
                 className="flex items-center"
               >
                 {checkingInOut[user._id!] ? (
                   'ກຳລັງດຳເນີນການ...' 
                 ) : (
                   <>
                     {user.checkInStatus === 'checked-in' ? (
                       <>
                         <FiLogOut className="mr-1" /> ອອກວຽກ
                       </>
                     ) : (
                       <>
                         <FiLogIn className="mr-1" /> ເຂົ້າວຽກ
                       </>
                     )}
                   </>
                 )}
               </NeoButton>
             </div>
           )}
           
           {/* เพิ่มปุ่ม View icon */}
           <div className="m-1">
             <button 
               className="p-2 text-green-500 hover:bg-green-50 rounded-full"
               onClick={() => setShowViewModal(true)}
             >
               <FiEye size={18} />
             </button>
           </div>
           
           {showEditButton && (
             <div className="m-1">
               <button 
                 className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"
                 onClick={() => setShowEditModal(true)}
               >
                 <FiEdit2 size={18} />
               </button>
             </div>
           )}
           
           {showDeleteButton && (
             <div className="m-1">
               <button 
                 className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                 onClick={() => onDelete(user._id!, user.role, user.name)}
               >
                 <FiTrash2 size={18} />
               </button>
             </div>
           )}
         </div>
       </div>
     </div>

     {/* Edit User Modal */}
     {showEditModal && (
       <EditUserModal
         user={user}
         onClose={() => setShowEditModal(false)}
         onSuccess={onRefresh}
       />
     )}

     {/* View User Modal */}
     {showViewModal && (
       <ViewUserModal
         user={user}
         onClose={() => setShowViewModal(false)}
       />
     )}
   </>
 );
};

export default UserCard;