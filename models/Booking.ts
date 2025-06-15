// models/Booking.ts - Next.js 15 Compatible Booking Model
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBooking extends Document {
  booking_id: string;           // BK-YYMMDD-XXX
  travel_date: string;          // YYYY-MM-DD
  passenger_count: number;      // 1-10
  total_price: number;          // passenger_count * 45000
  
  // Contact Info
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  
  // Payment
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_link_id?: string;     // Lailao payment link ID
  payment_response?: any;       // Lailao webhook response
  transaction_id?: string;      // Lailao transaction ID
  
  // Booking Status
  booking_status: 'active' | 'cancelled' | 'used' | 'expired';
  
  // QR Code & Ticket
  ticket_id?: mongoose.Schema.Types.ObjectId;
  qr_code_sent: boolean;        // Email sent status
  
  // Cancellation (24 hours rule)
  can_cancel: boolean;
  cancelled_reason?: string;
  
  created_at: Date;
  expires_at: Date;
  cancelled_at?: Date;
  used_at?: Date;
}

const bookingSchema = new Schema({
  booking_id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  travel_date: { 
    type: String, 
    required: true 
  },
  passenger_count: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 10 
  },
  total_price: { 
    type: Number, 
    required: true 
  },
  
  // Contact Information
  contact_name: { 
    type: String, 
    required: true 
  },
  contact_phone: { 
    type: String, 
    required: true 
  },
  contact_email: { 
    type: String, 
    required: true 
  },
  
  // Payment Information
  payment_status: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  payment_link_id: String,
  payment_response: Schema.Types.Mixed,
  transaction_id: String,
  
  // Booking Status
  booking_status: {
    type: String,
    enum: ['active', 'cancelled', 'used', 'expired'],
    default: 'active'
  },
  
  // Ticket Information
  ticket_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ticket' 
  },
  qr_code_sent: { 
    type: Boolean, 
    default: false 
  },
  
  // Cancellation
  can_cancel: { 
    type: Boolean, 
    default: true 
  },
  cancelled_reason: String,
  
  // Timestamps
  expires_at: Date,
  cancelled_at: Date,
  used_at: Date
}, { 
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  } 
});

// Indexes for performance
bookingSchema.index({ booking_id: 1 }, { unique: true });
bookingSchema.index({ travel_date: 1, booking_status: 1 });
bookingSchema.index({ contact_email: 1 });
bookingSchema.index({ payment_status: 1 });
bookingSchema.index({ created_at: -1 });

// Pre-save middleware to set expiration and cancellation rules
bookingSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set expiration to 24 hours from creation
    this.expires_at = new Date(Date.now() + (24 * 60 * 60 * 1000));
    
    // Check if can cancel (within 24 hours)
    this.can_cancel = true;
  }
  
  // Update cancellation ability based on time
  const now = new Date();
  const createdTime = new Date(this.created_at);
  const hoursSinceCreation = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
  
  this.can_cancel = hoursSinceCreation < 24 && this.payment_status === 'paid';
  
  next();
});

// Static method: Generate unique booking ID
bookingSchema.statics.generateBookingId = async function(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  const latestBooking = await this.findOne().sort({ booking_id: -1 });
  let counter = 1;
  
  if (latestBooking && latestBooking.booking_id) {
    const match = latestBooking.booking_id.match(/\d+$/);
    if (match) {
      counter = parseInt(match[0]) + 1;
    }
  }
  
  const counterStr = counter.toString().padStart(3, '0');
  return `BK-${year}${month}${day}-${counterStr}`;
};

// Static method: Find bookings by travel date
bookingSchema.statics.findByTravelDate = function(travelDate: string) {
  return this.find({ 
    travel_date: travelDate,
    booking_status: { $in: ['active', 'used'] }
  });
};

// Static method: Get booking statistics
bookingSchema.statics.getBookingStats = async function(startDate?: Date, endDate?: Date) {
  const matchFilter: any = {};
  
  if (startDate && endDate) {
    matchFilter.created_at = { $gte: startDate, $lte: endDate };
  }
  
  const stats = await this.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        totalRevenue: { $sum: '$total_price' },
        totalPassengers: { $sum: '$passenger_count' },
        paidBookings: {
          $sum: { $cond: [{ $eq: ['$payment_status', 'paid'] }, 1, 0] }
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$booking_status', 'cancelled'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalBookings: 0,
    totalRevenue: 0,
    totalPassengers: 0,
    paidBookings: 0,
    cancelledBookings: 0
  };
};

// Instance method: Check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function(): boolean {
  const now = new Date();
  const createdTime = new Date(this.created_at);
  const hoursSinceCreation = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceCreation < 24 && 
         this.payment_status === 'paid' && 
         this.booking_status === 'active';
};

// Instance method: Cancel booking
bookingSchema.methods.cancelBooking = async function(reason?: string): Promise<void> {
  if (!this.canBeCancelled()) {
    throw new Error('Booking cannot be cancelled');
  }
  
  this.booking_status = 'cancelled';
  this.cancelled_at = new Date();
  this.cancelled_reason = reason || 'User cancellation';
  this.can_cancel = false;
  
  await this.save();
};

// Virtual field: Format travel date for display
bookingSchema.virtual('formattedTravelDate').get(function() {
  const date = new Date(this.travel_date);
  return date.toLocaleDateString('lo-LA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual field: Time remaining for cancellation
bookingSchema.virtual('cancellationTimeRemaining').get(function() {
  if (!this.can_cancel) return null;
  
  const now = new Date();
  const deadline = new Date(this.created_at);
  deadline.setHours(deadline.getHours() + 24);
  
  const timeRemaining = deadline.getTime() - now.getTime();
  return timeRemaining > 0 ? timeRemaining : 0;
});

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

// Handle multiple model compilation
const Booking: Model<IBooking> = mongoose.models.Booking || 
  mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;