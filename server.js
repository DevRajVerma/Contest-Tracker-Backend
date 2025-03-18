// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const contestFetcher = require('./services/contestFetcher');
const contestRoutes = require('./routes/contests');
const bookmarkRoutes = require('./routes/bookmarks');

const Contest = require('./models/Contest'); // Assuming you have a Contest model

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/contests', contestRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

// YouTube solution link form routes
app.post('/api/contests/:id/solution', async (req, res) => {
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

// Initial contest fetch
contestFetcher.updateContests();

// Schedule contest updates every 6 hours
cron.schedule('0 */6 * * *', () => {
  console.log('Running scheduled contest update');
  contestFetcher.updateContests();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});