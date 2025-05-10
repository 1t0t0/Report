'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiSearch, FiFilter, FiUser, FiXCircle, FiTruck } from 'react-icons/fi';
// ใช้ FiTruck แทน FiCar

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
  };
}

export default function CarsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State
  const [cars, setCars] = useState<Car[]>([]);
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [carTypes, setCarTypes] = useState<string[]>([]);
  
  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // Fetch cars data
  useEffect(() => {
    if (status === 'authenticated') {
      fetchCars();
    }
  }, [status]);
  
  // Fetch cars data
  const fetchCars = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/cars');
      if (!response.ok) {
        throw new Error('Failed to fetch cars');
      }
      
      const data = await response.json();
      console.log("API Response:", data);
      
      // ตรวจสอบว่า data เป็น array หรือไม่
      if (Array.isArray(data)) {
        setCars(data);
        setFilteredCars(data);
        
        // Extract unique car types
        const typesSet = new Set<string>();
        data.forEach((car: Car) => {
          if (car.car_type) typesSet.add(car.car_type);
        });
        setCarTypes(Array.from(typesSet));
      } else {
        console.error('API response is not an array:', data);
        setCars([]);
        setFilteredCars([]);
        setCarTypes([]);
      }
    } catch (error) {
      console.error('Error fetching cars:', error);
      setCars([]);
      setFilteredCars([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle search and filter
  useEffect(() => {
    let result = [...cars];
    
    // Filter by type
    if (selectedType !== 'all') {
      result = result.filter(car => car.car_type === selectedType);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(car => 
        (car.car_name?.toLowerCase() || '').includes(term) ||
        (car.car_registration?.toLowerCase() || '').includes(term) ||
        (car.user_id?.name?.toLowerCase() || '').includes(term)
      );
    }
    
    setFilteredCars(result);
  }, [cars, selectedType, searchTerm]);
  
  // Handle car click
  const handleCarClick = (carId: string) => {
    router.push(`/dashboard/cars/${carId}`);
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
  
  // Render car status
  const renderDriverStatus = (car: Car) => {
    if (!car.user_id) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 border border-red-200">
          ຍັງບໍ່ໄດ້ກຳນົດຄົນຂັບ
        </span>
      );
    }
    
    const status = car.user_id.checkInStatus;
    
    if (status === 'checked-in') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 border border-green-200">
          ເຊັກອິນແລ້ວ
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 border border-gray-200">
          ຍັງບໍ່ໄດ້ເຊັກອິນ
        </span>
      );
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">ຂໍ້ມູນລົດ</h1>
        <div className="bg-white p-6 rounded shadow">
          <div className="flex justify-center items-center h-40">
            <p>ກຳລັງໂຫລດ...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ຂໍ້ມູນລົດ</h1>
        <div className="flex gap-2">
          {session?.user?.role === 'admin' && (
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => router.push('/dashboard/cars/add')}
            >
              ເພີ່ມລົດ
            </button>
          )}
          <button 
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded"
            onClick={fetchCars}
          >
            ໂຫລດຂໍ້ມູນໃໝ່
          </button>
        </div>
      </div>
      
      {/* Search and Filter */}
      <div className="bg-white p-4 mb-6 rounded shadow">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
              placeholder="ຄົ້ນຫາລົດ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setSearchTerm('')}
              >
                <FiXCircle className="text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <FiFilter className="text-gray-400" />
            <span className="text-sm">ຕົວກອງ:</span>
            <select
              className="border border-gray-300 rounded-md p-2"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">ທັງໝົດ</option>
              {carTypes.map((type) => (
                <option key={type} value={type}>
                  {getCarTypeName(type)}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          ພົບ {filteredCars.length} ລາຍການ {filteredCars.length !== cars.length && `(ຈາກ ${cars.length} ລາຍການ)`}
        </div>
      </div>
      
      {/* Cars List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCars.length > 0 ? (
          filteredCars.map((car) => (
            <div 
              key={car._id} 
              className="bg-white p-4 rounded shadow hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleCarClick(car._id)}
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <FiTruck className="text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{car.car_name}</h3>
                  <p className="text-sm text-gray-500">{car.car_registration}</p>
                </div>
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-500">ປະເພດລົດ:</span>
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {getCarTypeName(car.car_type)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-500">ຄວາມຈຸ:</span>
                  <span className="font-medium">{car.car_capacity} ຄົນ</span>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-2">
                    <FiUser className="text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {car.user_id ? car.user_id.name : 'ຍັງບໍ່ມີຄົນຂັບ'}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {car.user_id ? car.user_id.employeeId || car.user_id.email : '-'}
                    </p>
                  </div>
                  <div>{renderDriverStatus(car)}</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full">
            <div className="bg-white p-6 text-center rounded shadow">
              <p className="text-gray-500">ບໍ່ພົບຂໍ້ມູນລົດ</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}