const express = require('express');
const {
  getMassagerRatings,
  createRating
} = require('../controllers/ratingController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/massager/:id', getMassagerRatings);
router.post('/', protect, createRating);

module.exports = router;