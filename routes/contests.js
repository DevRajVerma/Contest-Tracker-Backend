// routes/contests.js
const express = require('express');
const Contest = require('../models/Contest');
const router = express.Router();

// Get all contests
router.get('/', async (req, res) => {
  try {
    const { platform, status } = req.query;
    const query = {};
    
    if (platform) {
      query.platform = { $in: platform.split(',') };
    }
    
    if (status) {
      query.status = status;
    }
    
    const contests = await Contest.find(query).sort({ startTime: 1 });
    res.json(contests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update contest solution link
router.patch('/:id/solution', async (req, res) => {
  try {
    const { solutionLink } = req.body;
    const contest = await Contest.findByIdAndUpdate(
      req.params.id,
      { solutionLink },
      { new: true }
    );
    res.json(contest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

