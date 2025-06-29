// app/dashboard/tickets/components/TicketConfirmationModal.tsx - FIXED Car Data Refresh
import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import { FiX, FiPrinter, FiAlertCircle, FiUsers, FiUser, FiMapPin, FiTruck, FiSearch, FiChevronDown } from 'react-icons/fi';

interface Car {
  _id: string;
  car_id: string;
  car_name: string;
  car_registration: string;
  car_capacity: number;
  user_id: {
    _id: string;
    name: string;
    employeeId: string;
    checkInStatus: 'checked-in' | 'checked-out';
  };
  carType?: {
    carType_name: string;
  };
  // Real-time usage data
  currentUsage?: number;
  availableSeats?: number;
}

interface TicketConfirmationModalProps {
  isOpen: boolean;
  ticketPrice: number;
  paymentMethod: 'cash' | 'qr';
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  
  // Group Ticket Props
  ticketType: 'individual' | 'group';
  onTicketTypeChange: (type: 'individual' | 'group') => void;
  
  // Destination Props
  destination: string;
  onDestinationChange: (destination: string) => void;
  
  // Car Selection Props
  selectedCarRegistration: string;
  onCarChange: (carRegistration: string) => void;
}

// ✅ FIXED: Proper interface for car refresh callback
interface CarRefreshHandle {
  refreshCarData: () => void;
}

const TicketConfirmationModal = React.forwardRef<CarRefreshHandle, TicketConfirmationModalProps>(({
  isOpen, ticketPrice, paymentMethod, quantity, onQuantityChange, onConfirm, onCancel, loading,
  ticketType, onTicketTypeChange, destination, onDestinationChange,
  selectedCarRegistration, onCarChange
}, ref) => {
  const [inputValue, setInputValue] = useState(quantity.toString());
  const [error, setError] = useState('');
  const [cars, setCars] = useState<Car[]>([]);
  const [carsLoading, setCarsLoading] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  
  // Car selection dropdown states
  const [isCarDropdownOpen, setIsCarDropdownOpen] = useState(false);
  const [carSearchTerm, setCarSearchTerm] = useState('');
  const carDropdownRef = useRef<HTMLDivElement>(null);
  const carSearchInputRef = useRef<HTMLInputElement>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Ticket limits based on type
  const isGroupTicket = ticketType === 'group';
  const MIN_QUANTITY = isGroupTicket ? 2 : 1;
  const MAX_QUANTITY = isGroupTicket ? 10 : 20;

  // ✅ FIXED: Better typed function for car usage calculation
  const calculateCarUsage = async (carRegistration: string): Promise<{ currentUsage: number; availableSeats: number }> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/cars/usage?carRegistration=${carRegistration}&date=${today}&_t=${Date.now()}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            currentUsage: data.usage.currentUsage,
            availableSeats: data.usage.availableSeats
          };
        }
      }
    } catch (error) {
      console.warn('Error calculating car usage:', error);
    }
    
    return { currentUsage: 0, availableSeats: 0 };
  };

  // ✅ FIXED: Proper cleanup for event listeners
  useEffect(() => {
    if (isOpen) {
      fetchCarsWithDrivers();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (carDropdownRef.current && !carDropdownRef.current.contains(event.target as Node)) {
        setIsCarDropdownOpen(false);
        setCarSearchTerm('');
      }
    };

    if (isCarDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isCarDropdownOpen]);

  useEffect(() => {
    if (isCarDropdownOpen && carSearchInputRef.current) {
      const timer = setTimeout(() => {
        carSearchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCarDropdownOpen]);

  // ✅ FIXED: Enhanced imperative handle with proper car data refresh
  React.useImperativeHandle(ref, () => ({
    refreshCarData: async () => {
      console.log('🔄 Refreshing car data from external trigger...');
      await fetchCarsWithDrivers();
      
      // ✅ Auto-refresh selected car usage if still selected
      if (selectedCarRegistration) {
        await refreshCarUsage(selectedCarRegistration);
      }
    }
  }), [selectedCarRegistration]);

  // ✅ FIXED: Enhanced fetchCarsWithDrivers with proper refresh logic
  const fetchCarsWithDrivers = async () => {
    setCarsLoading(true);
    try {
      console.log('🚗 Fetching updated car data...');
      
      // Add cache busting parameter
      const response = await fetch(`/api/cars?_t=${Date.now()}`);
      const data = await response.json();
      
      if (response.ok && Array.isArray(data)) {
        // Filter only cars with checked-in drivers
        const onlineCars = data.filter((car: Car) => 
          car.user_id?.checkInStatus === 'checked-in'
        );
        
        // Add real-time usage data with fresh calculation
        const carsWithUsage = await Promise.all(
          onlineCars.map(async (car: Car) => {
            const { currentUsage, availableSeats } = await calculateCarUsage(car.car_registration);
            
            console.log(`🚗 ${car.car_registration}: Current usage: ${currentUsage}, Available: ${availableSeats}/${car.car_capacity}`);
            
            return {
              ...car,
              currentUsage,
              availableSeats
            };
          })
        );
        
        // Sort by available seats (most available first)
        const sortedCars = carsWithUsage.sort((a: Car, b: Car) => {
          if (a.availableSeats !== b.availableSeats) {
            return (b.availableSeats || 0) - (a.availableSeats || 0);
          }
          return a.car_registration.localeCompare(b.car_registration);
        });
        
        setCars(sortedCars);
        
        // ✅ Update selected car if it exists in the new data
        if (selectedCarRegistration) {
          const updatedSelectedCar = sortedCars.find(car => car.car_registration === selectedCarRegistration);
          if (updatedSelectedCar) {
            console.log(`✅ Updated selected car: ${updatedSelectedCar.car_registration}, Available: ${updatedSelectedCar.availableSeats}`);
            setSelectedCar(updatedSelectedCar);
          } else {
            console.warn(`⚠️ Previously selected car ${selectedCarRegistration} not found in updated data`);
            setSelectedCar(null);
          }
        } else if (sortedCars.length > 0) {
          // Auto-select first car if none selected
          const bestCar = sortedCars[0];
          onCarChange(bestCar.car_registration);
          setSelectedCar(bestCar);
          console.log(`🎯 Auto-selected best available car: ${bestCar.car_registration}`);
        }
        
      } else {
        console.warn('Failed to fetch cars:', data.error);
      }
    } catch (error) {
      console.error('Error fetching cars:', error);
    } finally {
      setCarsLoading(false);
    }
  };

  // ✅ FIXED: Enhanced refresh car usage
  const refreshCarUsage = async (carRegistration: string) => {
    console.log(`🔄 Refreshing usage for car: ${carRegistration}`);
    
    const { currentUsage, availableSeats } = await calculateCarUsage(carRegistration);
    
    console.log(`📊 Fresh usage data for ${carRegistration}: Used: ${currentUsage}, Available: ${availableSeats}`);
    
    // Update selected car if it matches
    if (selectedCar && selectedCar.car_registration === carRegistration) {
      const updatedSelectedCar = {
        ...selectedCar,
        currentUsage,
        availableSeats
      };
      setSelectedCar(updatedSelectedCar);
      console.log(`✅ Updated selected car state for ${carRegistration}`);
    }
    
    // Update cars array
    setCars(prevCars => 
      prevCars.map(car => 
        car.car_registration === carRegistration 
          ? { ...car, currentUsage, availableSeats }
          : car
      )
    );
  };

  // ✅ FIXED: Enhanced car select with immediate refresh
  const handleCarSelect = async (carRegistration: string) => {
    console.log(`🎯 Selecting car: ${carRegistration}`);
    
    onCarChange(carRegistration);
    const selected = cars.find(car => car.car_registration === carRegistration);
    setSelectedCar(selected || null);
    setIsCarDropdownOpen(false);
    setCarSearchTerm('');
    
    if (selected) {
      // Immediately refresh usage for selected car
      await refreshCarUsage(carRegistration);
    }
  };

  // ✅ FIXED: Auto refresh when modal opens
  useEffect(() => {
    if (isOpen && selectedCarRegistration) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        refreshCarUsage(selectedCarRegistration);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedCarRegistration]);

  // ✅ FIXED: Better filtering with proper null checks
  const filteredCars = cars.filter(car => {
    if (!carSearchTerm.trim()) return true;
    
    const searchLower = carSearchTerm.toLowerCase();
    
    const carRegistration = (car.car_registration || '').toLowerCase();
    const carName = (car.car_name || '').toLowerCase();
    const driverName = (car.user_id?.name || '').toLowerCase();
    const employeeId = (car.user_id?.employeeId || '').toLowerCase();
    
    return carRegistration.includes(searchLower) ||
           carName.includes(searchLower) ||
           driverName.includes(searchLower) ||
           employeeId.includes(searchLower);
  });

  // ✅ FIXED: Proper dependency array
  useEffect(() => {
    if (isOpen) {
      let newQuantity = quantity;
      if (isGroupTicket && quantity < MIN_QUANTITY) {
        newQuantity = MIN_QUANTITY;
      } else if (!isGroupTicket && quantity < MIN_QUANTITY) {
        newQuantity = MIN_QUANTITY;
      }
      
      setInputValue(newQuantity.toString());
      onQuantityChange(newQuantity);
      setError('');
    }
  }, [isOpen, quantity, isGroupTicket, MIN_QUANTITY, onQuantityChange]);

  // ✅ FIXED: Better keyboard event handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !loading && !error && inputValue) {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape' && !loading) {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, error, inputValue, onCancel]);

  if (!isOpen) return null;

  const getPaymentText = (method: string) => method === 'cash' ? 'ເງິນສົດ' : 'ເງິນໂອນ';
  
  // ✅ FIXED: Better input validation
  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    if (error) setError('');
    
    if (value === '') return;
    
    const numericValue = parseInt(value, 10);
    
    if (isNaN(numericValue)) {
      setError('ກະລຸນາໃສ່ຕົວເລກເທົ່ານັ້ນ');
      return;
    }
    
    if (numericValue < MIN_QUANTITY) {
      const unit = isGroupTicket ? 'ຄົນ' : 'ໃບ';
      setError(`ຈຳນວນຕໍ່າສຸດ ${MIN_QUANTITY} ${unit}`);
      return;
    }
    
    if (numericValue > MAX_QUANTITY) {
      const unit = isGroupTicket ? 'ຄົນ' : 'ໃບ';
      const limitText = isGroupTicket ? 'ຕໍ່ກຸ່ມ' : 'ຕໍ່ການພິມພ໌ 1 ຄັ້ງ';
      setError(`ຈຳນວນສູງສຸດ ${MAX_QUANTITY} ${unit}${limitText}`);
      return;
    }
    
    // Check car capacity with fresh data
    if (selectedCar && numericValue > (selectedCar.availableSeats || 0)) {
      setError(`ຈຳນວນຜູ້ໂດຍສານເກີນທີ່ນັ່ງທີ່ເຫຼືອ (ເຫຼືອ ${selectedCar.availableSeats} ທີ່ນັ່ງ)`);
      return;
    }
    
    setError('');
    onQuantityChange(numericValue);
  };

  // ✅ FIXED: Better quantity change logic
  const changeQuantity = (change: number) => {
    const newQuantity = quantity + change;
    const maxLimit = selectedCar ? 
      Math.min(MAX_QUANTITY, selectedCar.availableSeats || 0) : MAX_QUANTITY;
    
    if (newQuantity >= MIN_QUANTITY && newQuantity <= maxLimit) {
      const newValue = newQuantity.toString();
      setInputValue(newValue);
      handleInputChange(newValue);
    }
  };

  const totalAmount = ticketPrice * quantity;
  const hasValidQuantity = !error && inputValue && quantity >= MIN_QUANTITY && quantity <= MAX_QUANTITY;

  // ✅ FIXED: Enhanced confirm handling with fresh data check
  const handleConfirm = async () => {
    if (!hasValidQuantity || !selectedCarRegistration) {
      return;
    }
    
    console.log('🎯 Confirming ticket creation...');
    
    // ✅ Force refresh car usage before confirming
    if (selectedCar) {
      console.log('🔄 Final refresh before confirmation...');
      await refreshCarUsage(selectedCar.car_registration);
      
      // Get fresh selected car data
      const freshCar = cars.find(car => car.car_registration === selectedCar.car_registration);
      if (freshCar) {
        console.log(`📊 Fresh data check: Available seats: ${freshCar.availableSeats}, Requested: ${quantity}`);
        
        // Check again with fresh data
        if (quantity > (freshCar.availableSeats || 0)) {
          setError(`ທີ່ນັ່ງບໍ່ພຽງພໍ! ປັດຈຸບັນເຫຼືອ ${freshCar.availableSeats} ທີ່ນັ່ງ`);
          return;
        }
      }
    }
    
    onConfirm();
  };

  const handleInputFocus = () => {
    // No auto-select on focus
  };

  const handleInputBlur = () => {
    if (!inputValue || inputValue === '0') {
      setInputValue(MIN_QUANTITY.toString());
      handleInputChange(MIN_QUANTITY.toString());
    }
  };

  // Real-time car capacity calculations with fresh data
  const currentUsage = selectedCar?.currentUsage || 0;
  const availableSeats = selectedCar?.availableSeats || 0;
  const totalCapacity = selectedCar?.car_capacity || 0;
  const afterBooking = currentUsage + quantity;
  const remainingAfterBooking = Math.max(0, totalCapacity - afterBooking);
  const usagePercentage = totalCapacity > 0 ? Math.round((afterBooking / totalCapacity) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border max-h-[90vh] overflow-y-auto">
        <div className="bg-blue-500 text-white p-4 flex items-center justify-between sticky top-0">
          <div className="flex items-center">
            <FiPrinter className="mr-2" />
            <h3 className="text-lg font-bold">ຢືນຢັນອອກປີ້</h3>
          </div>
          <button 
            onClick={onCancel} 
            className="p-1 hover:bg-blue-600 rounded transition-colors" 
            disabled={loading}
            title="ປິດ (ESC)"
          >
            <FiX />
          </button>
        </div>
        
        <div className="p-6">
          {/* Car Selection + Ticket Type Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Car Selection Section */}
            <div>
              <div className="text-sm font-semibold mb-3 text-gray-700 flex items-center">
                <FiTruck className="h-4 w-4 mr-2" />
                ເລືອກລົດ ແລະ ຄົນຂັບ
                {carsLoading && (
                  <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                )}
              </div>
              
              {carsLoading ? (
                <div className="py-6 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">ກຳລັງໂຫລດຂໍ້ມູນລົດ...</p>
                </div>
              ) : (
                <div className="relative" ref={carDropdownRef}>
                  {/* Car Selection Dropdown */}
                  <button
                    onClick={() => setIsCarDropdownOpen(!isCarDropdownOpen)}
                    className={`w-full p-3 text-left rounded-lg transition border ${
                      selectedCar
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' 
                        : 'bg-white border-gray-300 hover:border-blue-300'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {selectedCar ? (
                          <div>
                            <div className="flex items-center mb-1">
                              <p className="font-bold text-base text-gray-900">{selectedCar.car_registration}</p>
                              <span className="ml-2 text-sm text-gray-500">({selectedCar.car_name})</span>
                              <span className="ml-2 text-xs text-blue-600">
                                {selectedCar.car_capacity} ທີ່ນັ່ງ
                              </span>
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <span>ຄົນຂັບ: <strong>{selectedCar.user_id?.name || 'ไม่ระบุ'}</strong></span>
                              <span className="mx-2">•</span>
                              <span>{selectedCar.user_id?.employeeId || 'N/A'}</span>
                            </div>
                            
                            <div className="flex items-center text-xs">
                              <span className={`${availableSeats > 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                                ເຫຼືອ {availableSeats} ບ່ອນນັ່ງ
                              </span>
                              <span className="mx-2 text-gray-400">•</span>
                              <span className="text-blue-600">ໃຊ້ແລ້ວ {currentUsage}/{totalCapacity}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-500">
                            <span>ກະລຸນາເລືອກລົດ...</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center ml-3">
                        {selectedCar && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                            🟢 ອອນລາຍ
                          </span>
                        )}
                        <FiChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isCarDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isCarDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-80 overflow-hidden">
                      {/* Search input */}
                      <div className="p-3 border-b border-gray-200">
                        <div className="relative">
                          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            ref={carSearchInputRef}
                            type="text"
                            placeholder="ຄົ້ນຫາລົດ, ຄົນຂັບ, ຫຼືລະຫັດ..."
                            value={carSearchTerm}
                            onChange={(e) => setCarSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                      </div>

                      {/* Car list */}
                      <div className="max-h-48 overflow-y-auto">
                        {filteredCars.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            {carSearchTerm ? (
                              <div>
                                <FiSearch className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm">ບໍ່ພົບລົດທີ່ຕົງກັບ "{carSearchTerm}"</p>
                              </div>
                            ) : (
                              <div>
                                <FiAlertCircle className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm">ບໍ່ພົບລົດທີ່ມີຄົນຂັບອອນລາຍ</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          filteredCars.map((car) => (
                            <button
                              key={car._id}
                              onClick={() => handleCarSelect(car.car_registration)}
                              className={`w-full p-3 text-left hover:bg-gray-50 transition border-b border-gray-100 last:border-b-0 ${
                                selectedCarRegistration === car.car_registration ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center mb-1">
                                    <p className="font-bold text-sm text-gray-900">{car.car_registration}</p>
                                    <span className="ml-2 text-xs text-gray-500">({car.car_name})</span>
                                    <span className="ml-2 text-xs text-blue-600">{car.car_capacity}ບ່ອນ</span>
                                  </div>
                                  
                                  <div className="flex items-center text-xs text-gray-600 mb-1">
                                    <span>ຄົນຂັບ: <strong>{car.user_id?.name || 'ไม่ระบุ'}</strong></span>
                                    <span className="mx-2">•</span>
                                    <span>{car.user_id?.employeeId || 'N/A'}</span>
                                  </div>
                                  
                                  <div className="flex items-center text-xs">
                                    <span className={`${(car.availableSeats || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      เหลือ {car.availableSeats || 0} ບ່ອນນັ່ງ
                                    </span>
                                    <span className="mx-2 text-gray-400">•</span>
                                    <span className="text-blue-600">ໃຊ້ແລ້ວ {car.currentUsage || 0}/{car.car_capacity}</span>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-end ml-3">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-1 bg-green-100 text-green-800">
                                    🟢 ອອນລາຍ
                                  </span>
                                  
                                  {selectedCarRegistration === car.car_registration && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ticket Type Selection */}
            <div>
              <div className="text-sm font-semibold mb-3 text-gray-700">ປະເພດປີ້</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onTicketTypeChange('individual')}
                  className={`relative py-3 px-4 text-center font-semibold rounded-lg transition border-2 ${
                    ticketType === 'individual'
                      ? 'bg-blue-500 text-white border-blue-500 shadow-md' 
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  disabled={loading}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <FiUser className="h-5 w-5" />
                    <span className="text-sm">ປີ້ປົກກະຕິ</span>
                  </div>
                  {ticketType === 'individual' && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full"></div>
                  )}
                </button>
                
                <button
                  onClick={() => onTicketTypeChange('group')}
                  className={`relative py-3 px-4 text-center font-semibold rounded-lg transition border-2 ${
                    ticketType === 'group'
                      ? 'bg-green-500 text-white border-green-500 shadow-md' 
                      : 'bg-white text-gray-700 border-gray-200 hover:border-green-300 hover:bg-green-50'
                  }`}
                  disabled={loading}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <FiUsers className="h-5 w-5" />
                    <span className="text-sm">ປີ້ກຸ່ມ</span>
                  </div>
                  {ticketType === 'group' && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full"></div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Destination + Quantity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Destination Input */}
            <div>
              <div className="text-sm font-semibold mb-3 text-gray-700 flex items-center">
                <FiMapPin className="h-4 w-4 mr-2" />
                ປາຍທາງ (ບໍ່ບັງຄັບ)
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => onDestinationChange(e.target.value)}
                  placeholder="ຕົວເມືອງ (ຖ້າບໍ່ໃສ່ຈະເປັນປາຍທາງມາດຕະຖານ)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                💡 ຖ້າບໍ່ໃສ່ຈະໃຊ້ປາຍທາງມາດຕະຖານ: "ຕົວເມືອງ"
              </p>
            </div>

            {/* Quantity Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold">
                  {isGroupTicket ? 'ຈຳນວນຄົນ' : 'ຈຳນວນໃບ'}
                </label>
                <div className="text-xs text-gray-500">
                  {selectedCar ? (
                    `ເຫຼືອ ${availableSeats} ທີ່ນັ່ງ (ທັງໝົດ ${totalCapacity})`
                  ) : (
                    isGroupTicket ? 'ສູງສຸດ 10 ຄົນ/ກຸ່ມ' : 'ສູງສຸດ 20 ໃບ/ຄັ້ງ'
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => changeQuantity(-1)}
                  disabled={quantity <= MIN_QUANTITY || loading}
                  className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center font-bold text-lg transition ${
                    quantity <= MIN_QUANTITY || loading 
                      ? 'border-gray-300 text-gray-300 cursor-not-allowed bg-gray-100' 
                      : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50'
                  }`}
                >
                  −
                </button>
                
                <div className="flex flex-col items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    disabled={loading}
                    className={`w-16 h-10 text-xl font-bold text-center border-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      error 
                        ? 'border-red-500 bg-red-50 text-red-700' 
                        : 'border-gray-300 bg-white hover:border-blue-300 focus:border-blue-500'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder={MIN_QUANTITY.toString()}
                  />
                  
                  {error && (
                    <div className="flex items-center mt-1 text-xs text-red-600">
                      <FiAlertCircle className="w-3 h-3 mr-1" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => changeQuantity(1)}
                  disabled={quantity >= (selectedCar ? Math.min(MAX_QUANTITY, availableSeats) : MAX_QUANTITY) || loading}
                  className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center font-bold text-lg transition ${
                    quantity >= (selectedCar ? Math.min(MAX_QUANTITY, availableSeats) : MAX_QUANTITY) || loading 
                      ? 'border-gray-300 text-gray-300 cursor-not-allowed bg-gray-100' 
                      : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50'
                  }`}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Car Capacity Information */}
          {selectedCar && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">ຂໍ້ມູນຄວາມຈຸລົດ (Real-time)</span>
                <span className="text-xs text-blue-600">{selectedCar.car_registration}</span>
              </div>
              
              <div className="grid grid-cols-4 gap-3 text-center text-sm mb-3">
                <div className="bg-blue-100 rounded p-2">
                  <div className="font-bold text-blue-600">{currentUsage}</div>
                  <div className="text-gray-600 text-xs">ກຳລັງໃຊ້</div>
                </div>
                <div className="bg-orange-100 rounded p-2">
                  <div className="font-bold text-orange-600">{quantity}</div>
                  <div className="text-gray-600 text-xs">ຈະຈອງ</div>
                </div>
                <div className="bg-green-100 rounded p-2">
                  <div className="font-bold text-green-600">{remainingAfterBooking}</div>
                  <div className="text-gray-600 text-xs">ຈະເຫຼືອ</div>
                </div>
                <div className="bg-gray-100 rounded p-2">
                  <div className="font-bold text-gray-600">{totalCapacity}</div>
                  <div className="text-gray-600 text-xs">ທັງໝົດ</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>ອັດຕາການໃຊ້ງານຫຼັງຈອງ: {usagePercentage}%</span>
                  <span>{afterBooking}/{totalCapacity} ຄົນ</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      usagePercentage >= 100 ? 'bg-red-500' :
                      usagePercentage >= 80 ? 'bg-orange-500' : 
                      usagePercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Warning messages */}
              {quantity > availableSeats && (
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                  ⚠️ ຈຳນວນຜູ້ໂດຍສານເກີນທີ່ນັ່ງທີ່ເຫຼືອ!
                </div>
              )}
              
              {usagePercentage === 100 && (
                <div className="mt-2 p-2 bg-orange-100 border border-orange-300 rounded text-xs text-orange-800">
                  🚌 ລົດຈະເຕັມພໍດີຫຼັງຈາກຈອງນີ້
                </div>
              )}
            </div>
          )}

          {/* Price Summary Section */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  {isGroupTicket ? 'ລາຄາຕໍ່ຄົນ' : 'ລາຄາຕໍ່ໃບ'}
                </div>
                <div className="text-lg font-bold text-gray-800">₭{ticketPrice.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">ຈຳນວນ</div>
                <div className="text-lg font-bold text-blue-600">
                  {quantity} {isGroupTicket ? 'ຄົນ' : 'ໃບ'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">ວິທີຊຳລະ</div>
                <div className="text-lg font-bold text-green-600">{getPaymentText(paymentMethod)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">ລວມທັງໝົດ</div>
                <div className="text-xl font-bold text-red-600">₭{totalAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Validation Alert for Car Selection */}
          {!selectedCarRegistration && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-6">
              <div className="flex items-start">
                <FiAlertCircle className="text-yellow-600 mr-2 mt-0.5" />
                <div className="text-yellow-700 text-sm">
                  <strong>ກະລຸນາເລືອກລົດ ແລະ ຄົນຂັບ</strong> ກ່ອນທີ່ຈະອອກປີ້
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition border"
              onClick={onCancel}
              disabled={loading}
              title="ຍົກເລີກ (ESC)"
            >
              ຍົກເລີກ
            </button>
            
            <button
              className={`flex-1 py-3 rounded-lg font-medium transition flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white ${
                loading || !hasValidQuantity || !selectedCarRegistration || (selectedCar && quantity > (selectedCar.availableSeats || 0)) ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              onClick={handleConfirm}
              disabled={loading || !hasValidQuantity || !selectedCarRegistration || (selectedCar && quantity > (selectedCar.availableSeats || 0))}
              title={hasValidQuantity && selectedCarRegistration ? "ຢືນຢັນ (Enter)" : "ກະລຸນາແກ້ໄຂຂໍ້ມູນກ່ອນ"}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ກຳລັງດຳເນີນການ...
                </div>
              ) : (
                <>
                  <FiPrinter className="mr-2" />
                  ຢືນຢັນອອກປີ້
                </>
              )}
            </button>
          </div>
          
          {/* Keyboard shortcuts hint */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center space-y-1">
              <div>⌨️ <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> ເພື່ອຢືນຢັນ • <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">ESC</kbd> ເພື່ອຍົກເລີກ</div>
              <div className="text-blue-600">📝 ລະບົບ POS: ຮະບຸລົດໃຫ້ລູກຄ້າທັນທີ (Real-time capacity updates)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TicketConfirmationModal.displayName = 'TicketConfirmationModal';

export default TicketConfirmationModal;