const express = require('express');
const {
  getMassagers,
  getMassager,
  getMassagerAvailability,
  searchMassagers
} = require('../controllers/massagerController');

const router = express.Router();

router.get('/', getMassagers);
router.get('/search', searchMassagers);
router.get('/:id', getMassager);
router.get('/:id/availability', getMassagerAvailability);

module.exports = router;