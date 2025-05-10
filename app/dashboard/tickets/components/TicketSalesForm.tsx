import React from 'react';

interface TicketSalesFormProps {
  ticketPrice: number;
  paymentMethod: 'cash' | 'qr';
  setPaymentMethod: (method: 'cash' | 'qr') => void;
  onSellTicket: () => Promise<void>;
  loading: boolean;
}

/**
 * คอมโพเนนต์แบบฟอร์มขายตั๋ว
 */
const TicketSalesForm: React.FC<TicketSalesFormProps> = ({
  ticketPrice,
  paymentMethod,
  setPaymentMethod,
  onSellTicket,
  loading
}) => {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-gray-600 uppercase font-medium mb-1">TICKET PRICE</p>
        <p className="text-3xl font-bold">₭{ticketPrice.toLocaleString()}</p>
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-600 uppercase font-medium mb-1">PAYMENT METHOD</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`py-2 px-4 text-center font-medium rounded ${
              paymentMethod === 'cash' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setPaymentMethod('cash')}
          >
            ເງິນສົດ
          </button>
          <button
            className={`py-2 px-4 text-center font-medium rounded ${
              paymentMethod === 'qr' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setPaymentMethod('qr')}
          >
            ເງິນໂອນ
          </button>
        </div>
      </div>

      <button
        className="w-full py-3 px-4 bg-blue-500 text-white font-medium rounded"
        onClick={onSellTicket}
        disabled={loading}
      >
        {loading ? 'PROCESSING...' : 'SELL TICKET'}
      </button>
    </div>
  );
};

export default TicketSalesForm;