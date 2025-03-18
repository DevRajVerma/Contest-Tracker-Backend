// routes/bookmarks.js
const express = require('express');
const Bookmark = require('../models/Bookmark');
const router = express.Router();

// Add a bookmark
router.post('/', async (req, res) => {
  try {
    const { contestId, userId } = req.body;
    const bookmark = new Bookmark({ contestId, userId });
    const newBookmark = await bookmark.save();
    res.status(201).json(newBookmark);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get user's bookmarks
router.get('/:userId', async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.params.userId }).populate('contestId');
    res.json(bookmarks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a bookmark
router.delete('/:id', async (req, res) => {
  try {
    await Bookmark.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bookmark deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;