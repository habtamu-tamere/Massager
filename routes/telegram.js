const express = require('express');
const axios = require('axios');
const Booking = require('../models/Booking');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Send booking details to Telegram channel
router.post('/', async (req, res) => {
  try {
    const { bookingId, message } = req.body;
    
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }
    
    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate('user')
      .populate('massager');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if user owns the booking
    if (booking.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }
    
    // Format message for Telegram
    const telegramMessage = message || 
      `New booking: ${req.user.name} booked ${booking.massager.name} on ${booking.date.toDateString()} at ${booking.time} for ${booking.price} ETB`;
    
    // Send to Telegram channel
    try {
      if (process.env.TELEGRAM_BOT_TOKEN) {
        const response = await axios.post(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            chat_id: process.env.TELEGRAM_CHANNEL_ID,
            text: telegramMessage,
            parse_mode: 'HTML'
          }
        );
        
        res.status(200).json({
          success: true,
          message: 'Booking details sent to Telegram channel',
          data: response.data
        });
      } else {
        // Simulate success if no Telegram bot token is configured
        console.log('Telegram message (simulated):', telegramMessage);
        res.status(200).json({
          success: true,
          message: 'Booking details would be sent to Telegram channel',
          data: { telegramMessage }
        });
      }
    } catch (telegramError) {
      console.error('Telegram API error:', telegramError.message);
      res.status(500).json({
        success: false,
        message: 'Failed to send message to Telegram channel'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
