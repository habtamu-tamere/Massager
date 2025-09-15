const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  massager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 0.5,
    max: 8
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['telebirr'],
    default: 'telebirr'
  },
  location: {
    type: String,
    required: true
  },
  specialRequests: {
    type: String,
    maxlength: 500
  },
  cancellationReason: {
    type: String,
    maxlength: 500
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Index for efficient queries
bookingSchema.index({ client: 1, createdAt: -1 });
bookingSchema.index({ massager: 1, date: 1 });
bookingSchema.index({ date: 1, startTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);