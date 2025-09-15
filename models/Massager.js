const mongoose = require('mongoose');

const massagerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  specialties: {
    type: [String],
    required: true
  },
  experience: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    maxlength: 500
  },
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  availability: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    slots: [{
      start: String,
      end: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    }]
  }],
  images: [{
    url: String,
    caption: String
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Massager', massagerSchema);