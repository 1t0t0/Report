'use client';

import { useState, useEffect, use } from 'react'; // เพิ่ม import use
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiUser, FiMapPin, FiPhone, FiMail, FiCalendar, FiEdit2, FiCheck, FiX, FiTruck } from 'react-icons/fi';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import useConfirmation from '@/hooks/useConfirmation';

interface Car {
  _id: string;
  car_id: string;
  car_name: string;
  car_capacity: number;
  car_registration: string;
  car_type: string;
  user_id?: {
    _id: string;
    name: string;
    email: string;
    role: string;
    employeeId?: string;
    phone?: string;
    checkInStatus?: string;
    status?: string;
  };
}

interface Driver {
  _id: string;
  name: string;
  email: string;
  employeeId?: string;
  phone?: string;
  status?: string;
  checkInStatus?: string;
}

export default function CarDetailPage({ params }: { params: { id: string } }) {
  // แกะค่า params ด้วย React.use()
  const resolvedParams = use(params);
  const carId = resolvedParams.id;
  
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isConfirmDialogOpen, confirmMessage, showConfirmation, handleConfirm, handleCancel } = useConfirmation();
  
  // State
  const [car, setCar] = useState<Car | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Check if user is admin
  useEffect(() => {
    if (session?.user?.role === 'admin') {
      setIsAdmin(true);
    }
  }, [session]);
  
  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // Fetch car data
  useEffect(() => {
    if (status === 'authenticated' && carId) {
      fetchCarData();
    }
  }, [status, carId]);
  
  // Fetch car data
  const fetchCarData = async () => {
    try {
      setLoading(true);
      
      // Fetch car details
      const response = await fetch(`/api/cars/${carId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch car details');
      }
      
      const carData = await response.json();
      setCar(carData);
      
      // Fetch available drivers if admin
      if (session?.user?.role === 'admin') {
        const driversResponse = await fetch('/api/users?role=driver');
        if (driversResponse.ok) {
          const driversData = await driversResponse.json();
          setDrivers(driversData);
        }
      }
    } catch (error) {
      console.error('Error fetching car details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle assign driver
  const handleAssignDriver = async () => {
    if (!selectedDriver) return;
    
    try {
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedDriver
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign driver');
      }
      
      // Refresh car data
      fetchCarData();
      setShowAssignDriver(false);
    } catch (error) {
      console.error('Error assigning driver:', error);
    }
  };
  
  // Handle remove driver
  const handleRemoveDriver = () => {
    showConfirmation('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບການມອບໝາຍຄົນຂັບລົດຄັນນີ້?', handleConfirmRemoveDriver);
  };
  
  // Confirm remove driver
  const handleConfirmRemoveDriver = async () => {
    try {
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: null
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove driver');
      }
      
      // Refresh car data
      fetchCarData();
    } catch (error) {
      console.error('Error removing driver:', error);
    }
  };
  
  // Handle delete car
  const handleDeleteCar = () => {
    showConfirmation('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຂໍ້ມູນລົດຄັນນີ້?', handleConfirmDeleteCar);
  };
  
  // Confirm delete car
  const handleConfirmDeleteCar = async () => {
    try {
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete car');
      }
      
      // Redirect back to cars page
      router.push('/dashboard/cars');
    } catch (error) {
      console.error('Error deleting car:', error);
    }
  };
  
  // Go back to cars list
  const handleGoBack = () => {
    router.push('/dashboard/cars');
  };
  
  // Get car type display name
  const getCarTypeName = (type: string) => {
    switch (type) {
      case 'van':
        return 'ລົດຕູ້';
      case 'minibus':
        return 'ລົດມິນິບັສ';
      case 'bus':
        return 'ລົດບັສ';
      case 'sedan':
        return 'ລົດເກັງ';
      default:
        return type;
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <button 
            className="mr-4 p-2 rounded-full hover:bg-gray-100" 
            onClick={handleGoBack}
          >
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">ລາຍລະອຽດລົດ</h1>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <div className="flex justify-center items-center h-40">
            <p>ກຳລັງໂຫລດ...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!car) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <button 
            className="mr-4 p-2 rounded-full hover:bg-gray-100" 
            onClick={handleGoBack}
          >
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">ລາຍລະອຽດລົດ</h1>
        </div>
        <div className="bg-white p-6 text-center rounded shadow">
          <p className="text-red-500">ບໍ່ພົບຂໍ້ມູນລົດ</p>
          <button 
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded" 
            onClick={handleGoBack}
          >
            ກັບຄືນ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <button 
          className="mr-4 p-2 rounded-full hover:bg-gray-100" 
          onClick={handleGoBack}
        >
          <FiArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">ລາຍລະອຽດລົດ</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Car Details */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded shadow">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <FiTruck className="text-blue-500 text-xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{car.car_name}</h2>
                  <p className="text-gray-500">{car.car_registration}</p>
                </div>
              </div>
              
              {isAdmin && (
                <div className="flex space-x-2">
                  <button 
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded flex items-center"
                    onClick={() => router.push(`/dashboard/cars/edit/${carId}`)}
                  >
                    <FiEdit2 className="mr-2" /> ແກ້ໄຂຂໍ້ມູນ
                  </button>
                  <button 
                    className="px-4 py-2 bg-red-500 text-white rounded"
                    onClick={handleDeleteCar}
                  >
                    ລຶບຂໍ້ມູນ
                  </button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border border-gray-100 rounded-md p-4">
                <div className="text-sm text-gray-500 mb-1">ລະຫັດລົດ</div>
                <div className="font-medium">{car.car_id}</div>
              </div>
              
              <div className="border border-gray-100 rounded-md p-4">
                <div className="text-sm text-gray-500 mb-1">ປະເພດລົດ</div>
                <div className="font-medium">{getCarTypeName(car.car_type)}</div>
              </div>
              
              <div className="border border-gray-100 rounded-md p-4">
                <div className="text-sm text-gray-500 mb-1">ຄວາມຈຸຜູ້ໂດຍສານ</div>
                <div className="font-medium">{car.car_capacity} ຄົນ</div>
              </div>
              
              <div className="border border-gray-100 rounded-md p-4">
                <div className="text-sm text-gray-500 mb-1">ທະບຽນລົດ</div>
                <div className="font-medium">{car.car_registration}</div>
              </div>
            </div>
            
            {car.user_id ? (
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-4">ຄົນຂັບລົດປະຈຳຄັນ</h3>
                <div className="border border-gray-100 rounded-md p-4">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                      <FiUser className="text-green-500 text-xl" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold">{car.user_id.name}</h4>
                      <p className="text-gray-500">
                        {car.user_id.employeeId} · 
                        <span className={`ml-2 ${
                          car.user_id.checkInStatus === 'checked-in' 
                            ? 'text-green-500' 
                            : 'text-gray-500'
                        }`}>
                          {car.user_id.checkInStatus === 'checked-in' ? 'ເຊັກອິນແລ້ວ' : 'ຍັງບໍ່ໄດ້ເຊັກອິນ'}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="flex items-center text-gray-500 mb-2">
                        <FiMail className="mr-2" /> ອີເມວ
                      </div>
                      <div>{car.user_id.email}</div>
                    </div>
                    
                    {car.user_id.phone && (
                      <div>
                        <div className="flex items-center text-gray-500 mb-2">
                          <FiPhone className="mr-2" /> ເບີໂທ
                        </div>
                        <div>{car.user_id.phone}</div>
                      </div>
                    )}
                  </div>
                  
                  {isAdmin && (
                    <div className="flex justify-end">
                      <button 
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                        onClick={handleRemoveDriver}
                      >
                        ລຶບການມອບໝາຍ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">ຄົນຂັບລົດ</h3>
                  {isAdmin && !showAssignDriver && (
                    <button 
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
                      onClick={() => setShowAssignDriver(true)}
                    >
                      ມອບໝາຍຄົນຂັບ
                    </button>
                  )}
                </div>
                
                {showAssignDriver ? (
                  <div className="border border-gray-100 rounded-md p-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">ເລືອກຄົນຂັບລົດ</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                      >
                        <option value="">-- ເລືອກຄົນຂັບລົດ --</option>
                        {drivers.map((driver) => (
                          <option key={driver._id} value={driver._id}>
                            {driver.name} {driver.employeeId ? `(${driver.employeeId})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <button 
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
                        onClick={() => setShowAssignDriver(false)}
                      >
                        <FiX className="mr-1 inline" /> ຍົກເລີກ
                      </button>
                      <button 
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                        onClick={handleAssignDriver}
                        disabled={!selectedDriver}
                      >
                        <FiCheck className="mr-1 inline" /> ຢືນຢັນ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-md p-8 text-center text-gray-500">
                    <FiUser className="mx-auto mb-2 text-4xl" />
                    <p>ຍັງບໍ່ໄດ້ມອບໝາຍຄົນຂັບລົດ</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        

      </div>
      
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