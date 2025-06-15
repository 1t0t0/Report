// app/booking/page.tsx - Main Booking Page
'use client';

import { useState } from 'react';
import BookingForm from '@/components/booking/BookingForm';
import BookingSteps from '@/components/booking/BookingSteps';

export default function BookingPage() {
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🚌 ຈອງປີ້ລົດເມ
          </h1>
          <p className="text-gray-600">
            ຈອງປີ້ລົດເມອອນລາຍ ງ່າຍ ແລະ ໄວ
          </p>
        </div>

        {/* Steps Indicator */}
        <BookingSteps currentStep={currentStep} />

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <BookingForm 
            currentStep={currentStep} 
            setCurrentStep={setCurrentStep}
          />
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>ສາມາດຍົກເລີກການຈອງໄດ້ພາຍໃນ 24 ຊົ່ວໂມງ</p>
          <p>ຕິດຕໍ່: 020-1234-5678 | info@busticketsystem.la</p>
        </div>
      </div>
    </div>
  );
}


