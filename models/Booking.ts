// models/Booking.ts - FIXED VERSION - แก้ไข duplicate index และ schema issues
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBooking extends Document {
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  travel_date: Date;
  passenger_count: number;
  destination: string;
  total_price: number;
  payment_slip_url: string;
  payment_status: 'pending' | 'approved' | 'rejected';
  booking_status: 'active' | 'cancelled';
  created_at: Date;
  updated_at: Date;
  can_cancel_until: Date;
  generated_ticket_id?: mongoose.Schema.Types.ObjectId;
  notes?: string;
}

const bookingSchema = new Schema({
  booking_id: { 
    type: String, 
    required: true, 
    unique: true  // ✅ ใช้ unique: true แทน schema.index()
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
    max: 10
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
    min: 0
    // ✅ ลบ validation ที่ใช้ this.passenger_count ออก เพราะทำให้ error
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
    type: Date
    // ✅ ลบ required: true ออก เพราะจะ set ใน pre-save
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

// ✅ ลบ duplicate indexes ออกเพราะ unique: true จะสร้างให้อัตโนมัติ
// เก็บไว้เฉพาะ index ที่จำเป็น
bookingSchema.index({ customer_phone: 1 });
bookingSchema.index({ customer_email: 1 });
bookingSchema.index({ travel_date: 1 });
bookingSchema.index({ payment_status: 1 });
bookingSchema.index({ booking_status: 1 });
bookingSchema.index({ created_at: -1 });

// ✅ แก้ไข Pre-save middleware ให้ทำงานได้ถูกต้อง
bookingSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      // ✅ ตรวจสอบราคาก่อน save
      const expectedPrice = 45000 * this.passenger_count;
      if (this.total_price !== expectedPrice) {
        this.total_price = expectedPrice;
      }
      
      // Generate booking ID ถ้ายังไม่มี
      if (!this.booking_id) {
        this.booking_id = await generateUniqueBookingId();
      }
      
      // Set cancellation deadline (10 hours from creation)
      if (!this.can_cancel_until) {
        this.can_cancel_until = new Date(Date.now() + (10 * 60 * 60 * 1000));
      }
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// ✅ ย้าย generateUniqueBookingId ออกมาเป็น function แยก
async function generateUniqueBookingId(): Promise<string> {
  const BookingModel = mongoose.models.Booking;
  if (!BookingModel) {
    throw new Error('Booking model not found');
  }
  
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const randomNum = Math.floor(Math.random() * 900) + 100;
    const bookingId = `BK-${year}${month}${day}-${randomNum}`;
    
    const existing = await BookingModel.findOne({ booking_id: bookingId });
    if (!existing) {
      return bookingId;
    }
    
    attempts++;
  }
  
  throw new Error('Unable to generate unique booking ID');
}

// Static method: Generate unique booking ID
bookingSchema.statics.generateBookingId = async function(): Promise<string> {
  return await generateUniqueBookingId();
};

// Static method: Find bookings by phone number
bookingSchema.statics.findByPhone = function(phone: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  return this.find({ 
    customer_phone: cleanPhone,
    booking_status: 'active'
  }).sort({ created_at: -1 });
};

// Instance method: Check if booking can be cancelled
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

// Virtual fields
bookingSchema.virtual('formattedPhone').get(function() {
  if (this.customer_phone && this.customer_phone.length === 10) {
    return `${this.customer_phone.slice(0, 3)}-${this.customer_phone.slice(3, 6)}-${this.customer_phone.slice(6)}`;
  }
  return this.customer_phone;
});

bookingSchema.virtual('canCancel').get(function() {
  return this.canBeCancelled();
});

bookingSchema.virtual('cancellationTimeLeft').get(function() {
  const now = new Date();
  if (now > this.can_cancel_until) {
    return 0;
  }
  return Math.max(0, this.can_cancel_until.getTime() - now.getTime());
});

bookingSchema.virtual('formattedTravelDate').get(function() {
  return this.travel_date.toLocaleDateString('lo-LA');
});

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

// ✅ ป้องกันการ compile ซ้ำ
const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;