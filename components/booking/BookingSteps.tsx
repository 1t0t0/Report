// components/booking/BookingSteps.tsx - Steps Indicator
interface BookingStepsProps {
  currentStep: number;
}

const BookingSteps: React.FC<BookingStepsProps> = ({ currentStep }) => {
  const steps = [
    { id: 1, name: 'ເລືອກວັນທີ', icon: '📅' },
    { id: 2, name: 'ຂໍ້ມູນຕິດຕໍ່', icon: '📝' },
    { id: 3, name: 'ຊຳລະເງິນ', icon: '💳' },
    { id: 4, name: 'ສຳເລັດ', icon: '✅' }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-full text-sm font-medium ${
                step.id <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.icon}
            </div>
            <div className="ml-2 hidden sm:block">
              <p
                className={`text-sm font-medium ${
                  step.id <= currentStep ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {step.name}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`hidden sm:block w-16 h-1 mx-4 ${
                  step.id < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingSteps;