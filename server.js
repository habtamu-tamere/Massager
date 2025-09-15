const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dimple', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  telegram: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'massager'], default: 'user' },
  specialty: { type: String },
  hourlyRate: { type: Number },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

// Massager Schema
const massagerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialty: { type: String, required: true },
  rating: { type: Number, default: 0 },
  price: { type: Number, required: true },
  image: { type: String, default: '💆' },
  available: { type: Boolean, default: true },
  reviewCount: { type: Number, default: 0 },
}, { timestamps: true });

// Booking Schema
const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  massager: { type: mongoose.Schema.Types.ObjectId, ref: 'Massager', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'confirmed' },
  paymentMethod: { type: String, default: 'telebirr' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String },
}, { timestamps: true });

// OTP Schema (for phone verification)
const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

// Models
const User = mongoose.model('User', userSchema);
const Massager = mongoose.model('Massager', massagerSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const OTP = mongoose.model('OTP', otpSchema);

// Auth Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Routes

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, telegram, password, role, specialty, hourlyRate } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      phone,
      telegram,
      password: hashedPassword,
      role,
      specialty,
      hourlyRate
    });

    await user.save();

    // Generate OTP (in production, send via SMS)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const otp = new OTP({
      phone,
      code: otpCode,
      expiresAt
    });

    await otp.save();

    // For demo purposes, we'll return the OTP
    res.status(201).json({ 
      message: 'User registered. OTP sent to phone.',
      otp: otpCode // Remove this in production
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Find the most recent OTP for this phone
    const otpRecord = await OTP.findOne({ 
      phone, 
      expiresAt: { $gt: new Date() } 
    }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.code !== otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Update user verification status
    const user = await User.findOneAndUpdate(
      { phone },
      { isVerified: true },
      { new: true }
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '7d' }
    );

    // Remove OTP record
    await OTP.deleteMany({ phone });

    res.json({
      message: 'Phone number verified successfully',
      token,
      data: { user }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend OTP
app.post('/api/auth/verify/resend', async (req, res) => {
  try {
    const { phone } = req.body;

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Generate new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const otp = new OTP({
      phone,
      code: otpCode,
      expiresAt
    });

    await otp.save();

    // For demo purposes, we'll return the OTP
    res.json({ 
      message: 'OTP sent successfully',
      otp: otpCode // Remove this in production
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: 'Please verify your phone number first' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      data: { user }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout
app.post('/api/auth/logout', auth, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Get massagers with pagination
app.get('/api/massagers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const massagers = await Massager.find({ available: true })
      .skip(skip)
      .limit(limit);

    const total = await Massager.countDocuments({ available: true });

    res.json({
      success: true,
      count: massagers.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: massagers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single massager
app.get('/api/massagers/:id', async (req, res) => {
  try {
    const massager = await Massager.findById(req.params.id);

    if (!massager) {
      return res.status(404).json({ message: 'Massager not found' });
    }

    res.json({
      success: true,
      data: massager
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create booking
app.post('/api/bookings', auth, async (req, res) => {
  try {
    const { massagerId, date, time, price, telebirrPhone } = req.body;

    // Get massager details
    const massager = await Massager.findById(massagerId);
    if (!massager) {
      return res.status(404).json({ message: 'Massager not found' });
    }

    // Check if the selected time is available
    const existingBooking = await Booking.findOne({
      massager: massagerId,
      date: new Date(date),
      time,
      status: { $in: ['confirmed', 'pending'] }
    });

    if (existingBooking) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    // Create booking
    const booking = new Booking({
      user: req.user._id,
      massager: massagerId,
      date: new Date(date),
      time,
      price,
      telebirrPhone
    });

    await booking.save();
    await booking.populate('massager');

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's bookings
app.get('/api/bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('massager')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel booking
app.delete('/api/bookings/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns the booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update booking status
    booking.status = 'cancelled';
    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit rating
app.post('/api/ratings', auth, async (req, res) => {
  try {
    const { bookingId, massagerId, rating, comment } = req.body;

    // Update booking with rating
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { rating, review: comment, status: 'completed' },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update massager rating
    const massager = await Massager.findById(massagerId);
    if (massager) {
      const newReviewCount = massager.reviewCount + 1;
      const newRating = ((massager.rating * massager.reviewCount) + rating) / newReviewCount;

      massager.rating = newRating;
      massager.reviewCount = newReviewCount;
      await massager.save();
    }

    res.json({
      success: true,
      message: 'Rating submitted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send notification (to Telegram)
app.post('/api/notifications', auth, async (req, res) => {
  try {
    const { massagerId, message } = req.body;

    // Get massager details
    const massager = await User.findById(massagerId);
    if (!massager || massager.role !== 'massager') {
      return res.status(404).json({ message: 'Massager not found' });
    }

    // In a real implementation, send Telegram message here
    // For now, we'll just log it
    console.log(`Telegram notification to ${massager.telegram || massager.phone}: ${message}`);

    res.json({
      success: true,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Share to Telegram channel
app.post('/api/telegram', auth, async (req, res) => {
  try {
    const { message } = req.body;

    // In a real implementation, send to Telegram channel here
    // For now, we'll just log it
    console.log(`Telegram channel message: ${message}`);

    res.json({
      success: true,
      message: 'Message sent to Telegram channel'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});