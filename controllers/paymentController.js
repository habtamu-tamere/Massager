const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User = require('../models/User');

// @desc    Initialize Telebirr payment
// @route   POST /api/payments/telebirr/initiate
// @access  Private
exports.initiateTelebirrPayment = async (req, res, next) => {
  try {
    const { bookingId, phoneNumber } = req.body;

    // Find the booking
    const booking = await Booking.findById(bookingId)
      .populate('client', 'name phone')
      .populate('massager', 'name');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is authorized to pay for this booking
    if (booking.client._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this booking'
      });
    }

    // Check if booking is already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already paid'
      });
    }

    // In a real implementation, this would call the Telebirr API
    // For demo purposes, we'll simulate the payment initiation
    const transactionId = 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const paymentUrl = `https://telebirr.com/pay/${transactionId}`;

    // Create payment record
    const payment = await Payment.create({
      booking: bookingId,
      client: req.user.id,
      amount: booking.totalAmount,
      paymentMethod: 'telebirr',
      transactionId: transactionId,
      telebirrResponse: {
        paymentUrl,
        transactionId
      }
    });

    res.status(200).json({
      success: true,
      data: {
        paymentId: payment._id,
        paymentUrl,
        transactionId
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Telebirr payment
// @route   POST /api/payments/telebirr/verify
// @access  Public
exports.verifyTelebirrPayment = async (req, res, next) => {
  try {
    const { transactionId, status } = req.body;

    // Find payment
    const payment = await Payment.findOne({ transactionId })
      .populate('booking');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // In a real implementation, this would verify with Telebirr API
    // For demo purposes, we'll simulate verification
    if (status === 'success') {
      // Update payment status
      payment.status = 'completed';
      payment.telebirrResponse.verification = { status: 'success' };
      await payment.save();

      // Update booking payment status
      payment.booking.paymentStatus = 'paid';
      payment.booking.status = 'confirmed';
      await payment.booking.save();

      console.log(`Payment confirmed for booking ${payment.booking._id}`);
    } else {
      payment.status = 'failed';
      await payment.save();

      console.log(`Payment failed for booking ${payment.booking._id}`);
    }

    res.status(200).json({
      success: true,
      message: 'Payment verification processed'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment details
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('booking')
      .populate('client', 'name phone');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user is authorized to view this payment
    if (req.user.role !== 'admin' && payment.client._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};