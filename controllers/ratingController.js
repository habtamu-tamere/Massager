const Rating = require('../models/Rating');
const Booking = require('../models/Booking');
const User = require('../models/User');

// @desc    Get ratings for a massager
// @route   GET /api/ratings/massager/:id
// @access  Public
exports.getMassagerRatings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const ratings = await Rating.find({ 
      massager: req.params.id, 
      isActive: true 
    })
      .populate('client', 'name')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Rating.countDocuments({ 
      massager: req.params.id, 
      isActive: true 
    });

    res.status(200).json({
      success: true,
      count: ratings.length,
      total,
      data: ratings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create rating
// @route   POST /api/ratings
// @access  Private
exports.createRating = async (req, res, next) => {
  try {
    // Check if booking exists and is completed
    const booking = await Booking.findById(req.body.booking);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is authorized to rate this booking
    if (booking.client.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to rate this booking'
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can only rate completed bookings'
      });
    }

    // Check if rating already exists for this booking
    const existingRating = await Rating.findOne({ booking: req.body.booking });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this booking'
      });
    }

    // Create rating
    const rating = await Rating.create({
      ...req.body,
      client: req.user.id,
      massager: booking.massager
    });

    // Update massager's average rating
    await updateMassagerRating(booking.massager);

    // Populate the rating with client details
    await rating.populate('client', 'name');

    res.status(201).json({
      success: true,
      data: rating
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to update massager's average rating
const updateMassagerRating = async (massagerId) => {
  const ratings = await Rating.find({ 
    massager: massagerId, 
    isActive: true 
  });
  
  if (ratings.length > 0) {
    const average = ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length;
    
    await User.findByIdAndUpdate(massagerId, {
      'rating.average': average,
      'rating.count': ratings.length
    });
  } else {
    await User.findByIdAndUpdate(massagerId, {
      'rating.average': 0,
      'rating.count': 0
    });
  }
};