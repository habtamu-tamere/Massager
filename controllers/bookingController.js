const Booking = require('../models/Booking');
const User = require('../models/User');
const Payment = require('../models/Payment');

// @desc    Get all bookings for a user
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res, next) => {
  try {
    let query;
    
    // Clients can see their bookings, massagers can see bookings assigned to them
    if (req.user.role === 'client') {
      query = { client: req.user.id };
    } else if (req.user.role === 'massager') {
      query = { massager: req.user.id };
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view bookings'
      });
    }

    const bookings = await Booking.find(query)
      .populate('client', 'name phone')
      .populate('massager', 'name services rating')
      .sort({ date: -1, startTime: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('client', 'name phone')
      .populate('massager', 'name services rating');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Make sure user is authorized to access this booking
    if (req.user.role !== 'admin' && 
        booking.client._id.toString() !== req.user.id && 
        booking.massager._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res, next) => {
  try {
    // Add client to req.body
    req.body.client = req.user.id;

    // Check if massager exists and is active
    const massager = await User.findOne({
      _id: req.body.massager,
      role: 'massager',
      isActive: true
    });

    if (!massager) {
      return res.status(404).json({
        success: false,
        message: 'Massager not found'
      });
    }

    // Check if the selected time slot is available
    const conflictingBooking = await Booking.findOne({
      massager: req.body.massager,
      date: req.body.date,
      startTime: req.body.startTime,
      status: { $in: ['confirmed', 'in-progress'] }
    });

    if (conflictingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }

    // Calculate end time based on duration
    const startTime = req.body.startTime;
    const duration = req.body.duration || 1; // Default to 1 hour
    const [hours, minutes] = startTime.split(':').map(Number);
    const endTimeDate = new Date(0, 0, 0, hours, minutes);
    endTimeDate.setHours(endTimeDate.getHours() + Math.floor(duration));
    endTimeDate.setMinutes(endTimeDate.getMinutes() + (duration % 1) * 60);
    
    const endTime = `${endTimeDate.getHours().toString().padStart(2, '0')}:${endTimeDate.getMinutes().toString().padStart(2, '0')}`;

    // Calculate total amount
    const totalAmount = massager.hourlyRate * duration;

    const booking = await Booking.create({
      ...req.body,
      endTime,
      totalAmount
    });

    // Populate the booking with massager details
    await booking.populate('massager', 'name services rating');

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private
exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Make sure user is authorized to update this booking
    if (req.user.role !== 'admin' && 
        booking.client.toString() !== req.user.id && 
        booking.massager.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Massagers can only update status to confirmed, in-progress, completed, or rejected
    if (req.user.role === 'massager' && 
        !['confirmed', 'in-progress', 'completed', 'rejected'].includes(req.body.status)) {
      return res.status(403).json({
        success: false,
        message: 'Massagers can only update booking status'
      });
    }

    // Clients can only cancel bookings
    if (req.user.role === 'client' && 
        req.body.status !== 'cancelled') {
      return res.status(403).json({
        success: false,
        message: 'Clients can only cancel bookings'
      });
    }

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('client', 'name phone').populate('massager', 'name services');

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Make sure user is owner of booking or admin
    if (req.user.role !== 'admin' && booking.client.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this booking'
      });
    }

    // Check if booking can be deleted (only pending or cancelled bookings)
    if (!['pending', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only pending or cancelled bookings can be deleted'
      });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};