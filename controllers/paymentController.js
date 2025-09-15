const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const telebirrService = require('../services/telebirrService');

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

    // Initialize payment with Telebirr
    const paymentData = {
      amount: booking.totalAmount,
      clientPhone: phoneNumber,
      clientName: booking.client.name,
      bookingId: booking._id.toString(),
      description: `Payment for massage session with ${booking.massager.name}`
    };

    const paymentResponse = await telebirrService.initiatePayment(paymentData);

    // Create payment record
    const payment = await Payment.create({
      booking: bookingId,
      client: req.user.id,
      amount: booking.totalAmount,
      paymentMethod: 'telebirr',
      transactionId: paymentResponse.transactionId,
      telebirrResponse: paymentResponse
    });

    res.status(200).json({
      success: true,
      data: {
        paymentId: payment._id,
        paymentUrl: paymentResponse.paymentUrl,
        transactionId: paymentResponse.transactionId
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Telebirr payment
// @route   POST /api/payments/telebirr/verify
// @access  Public (Telebirr will call this webhook)
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

    // Verify payment with Telebirr
    const verification = await telebirrService.verifyPayment(transactionId);

    if (verification.status === 'success') {
      // Update payment status
      payment.status = 'completed';
      payment.telebirrResponse.verification = verification;
      await payment.save();

      // Update booking payment status
      payment.booking.paymentStatus = 'paid';
      await payment.booking.save();

      // Send confirmation notification
      // This would typically be implemented with a notification service
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

// @desc    Process refund
// @route   POST /api/payments/:id/refund
// @access  Private (Admin only)
exports.processRefund = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const payment = await Payment.findById(req.params.id)
      .populate('booking');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if payment is eligible for refund
    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    // Process refund with Telebirr
    const refundResponse = await telebirrService.processRefund({
      transactionId: payment.transactionId,
      amount: payment.amount,
      reason: reason || 'Customer request'
    });

    if (refundResponse.status === 'success') {
      // Update payment status
      payment.status = 'refunded';
      payment.refundAmount = payment.amount;
      payment.refundReason = reason;
      payment.telebirrResponse.refund = refundResponse;
      await payment.save();

      // Update booking status
      payment.booking.paymentStatus = 'refunded';
      await payment.booking.save();

      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: refundResponse
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Refund failed',
        data: refundResponse
      });
    }
  } catch (error) {
    next(error);
  }
};