const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dimple', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'massager'], default: 'client' },
  services: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  location: { type: String, default: '' },
  availability: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Massager Schema
const massagerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialty: { type: String, required: true },
  rating: { type: Number, default: 0 },
  price: { type: Number, required: true },
  image: { type: String, default: '💆' },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  location: { type: String, required: true },
  availability: { type: String, default: 'Mon-Sat 9:00 AM - 8:00 PM' },
  reviews: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    createdAt: { type: Date, default: Date.now }
  }],
  isActive: { type: Boolean, default: true }
});

// Booking Schema
const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  massagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Massager', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  duration: { type: Number, default: 1 }, // in hours
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'telebirr' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  paymentPhone: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Massager = mongoose.model('Massager', massagerSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Routes

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, password, role, services, gender, location, availability } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      name,
      phone,
      password: hashedPassword,
      role,
      services,
      gender,
      location,
      availability
    });

    await user.save();

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Remove password from response
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Remove password from response
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all massagers with pagination and filtering
app.get('/api/massagers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const location = req.query.location;
    const specialty = req.query.specialty;

    // Build filter object
    const filter = { isActive: true };
    if (location) filter.location = new RegExp(location, 'i');
    if (specialty) filter.specialty = new RegExp(specialty, 'i');

    // Get massagers with pagination
    const massagers = await Massager.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ rating: -1, name: 1 });

    // Get total count for pagination
    const total = await Massager.countDocuments(filter);

    res.json({
      massagers,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalMassagers: total
    });
  } catch (error) {
    console.error('Get massagers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single massager
app.get('/api/massagers/:id', async (req, res) => {
  try {
    const massager = await Massager.findById(req.params.id).populate('reviews.userId', 'name');
    
    if (!massager) {
      return res.status(404).json({ message: 'Massager not found' });
    }

    res.json(massager);
  } catch (error) {
    console.error('Get massager error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create booking
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { massagerId, date, time, duration } = req.body;

    // Check if massager exists
    const massager = await Massager.findById(massagerId);
    if (!massager) {
      return res.status(404).json({ message: 'Massager not found' });
    }

    // Calculate total amount
    const totalAmount = massager.price * (duration || 1);

    // Create booking
    const booking = new Booking({
      userId: req.user._id,
      massagerId,
      date,
      time,
      duration: duration || 1,
      totalAmount
    });

    await booking.save();

    // Populate massager details in response
    await booking.populate('massagerId', 'name specialty price');

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Process payment
app.post('/api/bookings/:id/payment', authenticateToken, async (req, res) => {
  try {
    const { paymentPhone } = req.body;
    const bookingId = req.params.id;

    // Find booking
    const booking = await Booking.findOne({ _id: bookingId, userId: req.user._id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking is already paid
    if (booking.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Booking is already paid' });
    }

    // In a real implementation, integrate with Telebirr API here
    // This is a simulation of payment processing
    const paymentSuccess = Math.random() > 0.1; // 90% success rate for simulation

    if (paymentSuccess) {
      // Update booking status
      booking.paymentStatus = 'completed';
      booking.paymentPhone = paymentPhone;
      booking.status = 'confirmed';
      await booking.save();

      res.json({
        message: 'Payment processed successfully',
        booking
      });
    } else {
      // Simulate payment failure
      booking.paymentStatus = 'failed';
      await booking.save();

      res.status(400).json({ message: 'Payment failed. Please try again.' });
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add review
app.post('/api/massagers/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const massagerId = req.params.id;

    // Check if massager exists
    const massager = await Massager.findById(massagerId);
    if (!massager) {
      return res.status(404).json({ message: 'Massager not found' });
    }

    // Check if user has already reviewed this massager
    const existingReview = massager.reviews.find(
      r => r.userId.toString() === req.user._id.toString()
    );

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this massager' });
    }

    // Add review
    massager.reviews.push({
      userId: req.user._id,
      rating,
      review
    });

    // Update average rating
    const totalRatings = massager.reviews.reduce((sum, review) => sum + review.rating, 0);
    massager.rating = totalRatings / massager.reviews.length;

    await massager.save();

    res.status(201).json({
      message: 'Review added successfully',
      massager
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user bookings
app.get('/api/user/bookings', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const bookings = await Booking.find({ userId: req.user._id })
      .populate('massagerId', 'name specialty price image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments({ userId: req.user._id });

    res.json({
      bookings,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalBookings: total
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // For testing