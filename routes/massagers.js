const express = require('express');
const Massager = require('../models/Massager');

const router = express.Router();

// Get all massagers with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const massagers = await Massager.find({ available: true })
      .skip(skip)
      .limit(limit);
    
    const total = await Massager.countDocuments({ available: true });
    
    res.status(200).json({
      success: true,
      count: massagers.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: massagers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;