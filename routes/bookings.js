const express = require('express');
const {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking
} = require('../controllers/bookingController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getBookings)
  .post(protect, createBooking);

router.route('/:id')
  .get(protect, getBooking)
  .put(protect, updateBooking)
  .delete(protect, deleteBooking);

module.exports = router;