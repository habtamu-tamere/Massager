const express = require('express');
const {
  initiateTelebirrPayment,
  verifyTelebirrPayment,
  getPayment
} = require('../controllers/paymentController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/telebirr/initiate', protect, initiateTelebirrPayment);
router.post('/telebirr/verify', verifyTelebirrPayment);
router.get('/:id', protect, getPayment);

module.exports = router;