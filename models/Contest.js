// models/Contest.js
const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  platform: { type: String, required: true },
  url: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in minutes
  status: { type: String, enum: ['upcoming', 'ongoing', 'past'], required: true },
  solutionLink: { type: String, default: null }
});

module.exports = mongoose.model('Contest', contestSchema);
