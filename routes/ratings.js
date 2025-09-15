const express = require('express');
const {
  getMassagerRatings,
  createRating,
  updateRating,
  deleteRating
} = require('../controllers/ratingController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/massager/:id', getMassagerRatings);
router.post('/', protect, createRating);
router.put('/:id', protect, updateRating);
router.delete('/:id', protect, deleteRating);

module.exports = router;