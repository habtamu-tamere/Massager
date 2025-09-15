const User = require('../models/User');
const Booking = require('../models/Booking');

// @desc    Get all massagers
// @route   GET /api/massagers
// @access  Public
exports.getMassagers = async (req, res, next) => {
  try {
    // Filtering, sorting, pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await User.countDocuments({ role: 'massager', isActive: true });

    // Build query
    let query = User.find({ role: 'massager', isActive: true });

    // Select fields
    query = query.select('name phone services gender location availability rating');

    // Pagination
    query = query.skip(startIndex).limit(limit);

    // Execute query
    const massagers = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: massagers.length,
      pagination,
      data: massagers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single massager
// @route   GET /api/massagers/:id
// @access  Public
exports.getMassager = async (req, res, next) => {
  try {
    const massager = await User.findOne({
      _id: req.params.id,
      role: 'massager',
      isActive: true
    }).select('name phone services gender location availability rating');

    if (!massager) {
      return res.status(404).json({
        success: false,
        message: 'Massager not found'
      });
    }

    res.status(200).json({
      success: true,
      data: massager
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get massager availability
// @route   GET /api/massagers/:id/availability
// @access  Public
exports.getMassagerAvailability = async (req, res, next) => {
  try {
    const { date } = req.query;
    const massagerId = req.params.id;

    // Check if massager exists and is active
    const massager = await User.findOne({
      _id: massagerId,
      role: 'massager',
      isActive: true
    });

    if (!massager) {
      return res.status(404).json({
        success: false,
        message: 'Massager not found'
      });
    }

    // Get bookings for the massager on the specified date
    const bookings = await Booking.find({
      massager: massagerId,
      date: new Date(date),
      status: { $in: ['confirmed', 'in-progress'] }
    });

    // Parse availability from massager's schedule
    // This is a simplified implementation
    // In a real app, you'd need to consider the massager's working hours, breaks, etc.
    const availableSlots = [
      '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
    ];

    // Filter out booked slots
    const bookedSlots = bookings.map(booking => booking.startTime);
    const freeSlots = availableSlots.filter(slot => !bookedSlots.includes(slot));

    res.status(200).json({
      success: true,
      data: {
        date,
        availableSlots: freeSlots
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search massagers
// @route   GET /api/massagers/search
// @access  Public
exports.searchMassagers = async (req, res, next) => {
  try {
    const { location, service, minRating, maxPrice } = req.query;

    // Build query
    let query = { role: 'massager', isActive: true };

    if (location) {
      query.location = new RegExp(location, 'i');
    }

    if (service) {
      query.services = new RegExp(service, 'i');
    }

    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    const massagers = await User.find(query)
      .select('name phone services gender location availability rating');

    // Filter by max price if provided
    let filteredMassagers = massagers;
    if (maxPrice) {
      // This would typically involve a separate pricing model
      // For simplicity, we're just returning all results
      // In a real app, you'd query based on the massager's hourly rate
    }

    res.status(200).json({
      success: true,
      count: filteredMassagers.length,
      data: filteredMassagers
    });
  } catch (error) {
    next(error);
  }
};