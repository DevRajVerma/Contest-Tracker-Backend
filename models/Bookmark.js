// models/Bookmark.js
const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  userId: { type: String, required: true } // You can expand this to a User model if needed
});

module.exports = mongoose.model('Bookmark', bookmarkSchema);