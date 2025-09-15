const express = require('express');
const {
  initiateTelebirrPayment,
  verifyTelebirrPayment,
  getPayment,
  processRefund
} = require('../controllers/paymentController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/telebirr/initiate', protect, initiateTelebirrPayment);
router.post('/telebirr/verify', verifyTelebirrPayment);
router.get('/:id', protect, getPayment);
router.post('/:id/refund', protect, authorize('admin'), processRefund);

module.exports = router;