const mongoose = require('mongoose');

const massagerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  specialty: {
    type: String,
    required: true,
    enum: ['Swedish', 'Deep Tissue', 'Aromatherapy', 'Hot Stone', 'Thai', 'Shiatsu']
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 4.5
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    default: '💆'
  },
  available: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Massager', massagerSchema);
