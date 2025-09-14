const express = require('express');
const Booking = require('../models/Booking');
const Massager = require('../models/Massager');
const { protect } = require('../middleware/auth');
const { validateBooking } = require('../middleware/validation');

const router = express.Router();

// Protect all routes
router.use(protect);

// Create a new booking
router.post('/', validateBooking, async (req, res) => {
  try {
    const { massagerId, date, time } = req.body;
    
    // Get massager details
    const massager = await Massager.findById(massagerId);
    if (!massager) {
      return res.status(404).json({
        success: false,
        message: 'Massager not found'
      });
    }
    
    // Check if the selected time is available
    const existingBooking = await Booking.findOne({
      massager: massagerId,
      date: new Date(date),
      time,
      status: { $in: ['confirmed', 'pending'] }
    });
    
    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }
    
    // Create booking
    const booking = await Booking.create({
      user: req.user._id,
      massager: massagerId,
      date: new Date(date),
      time,
      price: massager.price
    });
    
    await booking.populate('massager');
    
    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user's bookings
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('massager')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
