// models/Booking.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBooking extends Document {
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  travel_date: Date;
  passenger_count: number;
  destination: string; // เส้นทางที่ลูกค้าระบุ
  total_price: number;
  payment_slip_url: string; // Cloudinary URL
  payment_status: 'pending' | 'approved' | 'rejected';
  booking_status: 'active' | 'cancelled';
  created_at: Date;
  updated_at: Date;
  can_cancel_until: Date; // คำนวณจาก created_at + 10 ชั่วโมง
  generated_ticket_id?: mongoose.Schema.Types.ObjectId; // เมื่อ admin อนุมัติจะสร้าง ticket
  notes?: string; // หมายเหตุจาก admin
}

const bookingSchema = new Schema({
  booking_id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  customer_name: { 
    type: String, 
    required: true,
    trim: true
  },
  customer_phone: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v: string) {
        // Validate Lao phone number format (10 digits)
        return /^\d{10}$/.test(v);
      },
      message: 'Phone number must be 10 digits'
    }
  },
  customer_email: { 
    type: String, 
    required: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  travel_date: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(v: Date) {
        // ต้องจองล่วงหน้าไม่เกิน 5 วัน
        const today = new Date();
        const maxDate = new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000));
        return v >= today && v <= maxDate;
      },
      message: 'Travel date must be within 5 days from today'
    }
  },
  passenger_count: { 
    type: Number, 
    required: true,
    min: 1,
    max: 10 // รองรับ group booking สูงสุด 10 คน
  },
  destination: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  total_price: { 
    type: Number, 
    required: true,
    min: 0,
    validate: {
      validator: function(v: number) {
        // ตรวจสอบว่าราคารวมถูกต้อง (45000 * passenger_count)
        const expectedPrice = 45000 * this.passenger_count;
        return v === expectedPrice;
      },
      message: 'Total price does not match passenger count'
    }
  },
  payment_slip_url: { 
    type: String, 
    required: true 
  },
  payment_status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  booking_status: { 
    type: String, 
    enum: ['active', 'cancelled'],
    default: 'active'
  },
  can_cancel_until: { 
    type: Date, 
    required: true 
  },
  generated_ticket_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ticket'
  },
  notes: { 
    type: String,
    maxlength: 500
  }
}, { 
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  } 
});

// Indexes for efficient queries
bookingSchema.index({ booking_id: 1 }, { unique: true });
bookingSchema.index({ customer_phone: 1 });
bookingSchema.index({ customer_email: 1 });
bookingSchema.index({ travel_date: 1 });
bookingSchema.index({ payment_status: 1 });
bookingSchema.index({ booking_status: 1 });
bookingSchema.index({ created_at: -1 });

// Pre-save middleware: Auto-generate booking_id and can_cancel_until
bookingSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate booking ID: BK-YYMMDD-XXX
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Generate 3-digit random number
    const randomNum = Math.floor(Math.random() * 900) + 100;
    this.booking_id = `BK-${year}${month}${day}-${randomNum}`;
    
    // Set cancellation deadline (10 hours from creation)
    this.can_cancel_until = new Date(this.created_at.getTime() + (10 * 60 * 60 * 1000));
  }
  next();
});

// Static method: Generate unique booking ID
bookingSchema.statics.generateBookingId = async function(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const randomNum = Math.floor(Math.random() * 900) + 100;
    const bookingId = `BK-${year}${month}${day}-${randomNum}`;
    
    const existing = await this.findOne({ booking_id: bookingId });
    if (!existing) {
      return bookingId;
    }
    
    attempts++;
  }
  
  throw new Error('Unable to generate unique booking ID');
};

// Static method: Find bookings by phone number
bookingSchema.statics.findByPhone = function(phone: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  return this.find({ 
    customer_phone: cleanPhone,
    booking_status: 'active'
  }).sort({ created_at: -1 });
};

// Static method: Check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function(): boolean {
  const now = new Date();
  return this.booking_status === 'active' && 
         this.payment_status !== 'approved' && 
         now <= this.can_cancel_until;
};

// Static method: Get pending bookings for admin
bookingSchema.statics.getPendingBookings = function() {
  return this.find({
    payment_status: 'pending',
    booking_status: 'active'
  }).sort({ created_at: 1 });
};

// Static method: Get bookings by date range
bookingSchema.statics.getBookingsByDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    travel_date: { $gte: startDate, $lte: endDate }
  }).sort({ travel_date: 1, created_at: 1 });
};

// Static method: Get booking statistics
bookingSchema.statics.getBookingStats = async function() {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(startOfToday.getTime() + (24 * 60 * 60 * 1000) - 1);
  
  const stats = await this.aggregate([
    {
      $facet: {
        todayBookings: [
          { $match: { created_at: { $gte: startOfToday, $lte: endOfToday } } },
          { $count: "count" }
        ],
        pendingBookings: [
          { $match: { payment_status: 'pending', booking_status: 'active' } },
          { $count: "count" }
        ],
        approvedBookings: [
          { $match: { payment_status: 'approved', booking_status: 'active' } },
          { $count: "count" }
        ],
        totalRevenue: [
          { $match: { payment_status: 'approved', booking_status: 'active' } },
          { $group: { _id: null, total: { $sum: '$total_price' } } }
        ],
        totalPassengers: [
          { $match: { payment_status: 'approved', booking_status: 'active' } },
          { $group: { _id: null, total: { $sum: '$passenger_count' } } }
        ]
      }
    }
  ]);
  
  return {
    todayBookings: stats[0].todayBookings[0]?.count || 0,
    pendingBookings: stats[0].pendingBookings[0]?.count || 0,
    approvedBookings: stats[0].approvedBookings[0]?.count || 0,
    totalRevenue: stats[0].totalRevenue[0]?.total || 0,
    totalPassengers: stats[0].totalPassengers[0]?.total || 0
  };
};

// Virtual field: Format phone number for display
bookingSchema.virtual('formattedPhone').get(function() {
  if (this.customer_phone && this.customer_phone.length === 10) {
    return `${this.customer_phone.slice(0, 3)}-${this.customer_phone.slice(3, 6)}-${this.customer_phone.slice(6)}`;
  }
  return this.customer_phone;
});

// Virtual field: Check if cancellation is still possible
bookingSchema.virtual('canCancel').get(function() {
  return this.canBeCancelled();
});

// Virtual field: Time left for cancellation
bookingSchema.virtual('cancellationTimeLeft').get(function() {
  const now = new Date();
  if (now > this.can_cancel_until) {
    return 0;
  }
  return Math.max(0, this.can_cancel_until.getTime() - now.getTime());
});

// Virtual field: Format travel date
bookingSchema.virtual('formattedTravelDate').get(function() {
  return this.travel_date.toLocaleDateString('lo-LA');
});

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

// Handle the case where this model might be compiled multiple times
const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;