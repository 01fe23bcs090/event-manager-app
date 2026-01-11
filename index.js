const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Load .env variables

// Import Models
const User = require('./models/User'); 
const Event = require('./models/Event');

const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
// Allow requests from anywhere (simplifies deployment)
app.use(cors());

// --- CONNECT TO DATABASE ---
// This uses the cloud URL if available, otherwise falls back to local
const dbURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eventApp';

mongoose.connect(dbURI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.log('❌ Connection Error:', err));

// --- ROUTES ---

// 1. REGISTER
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. LOGIN
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, 'secretKey123', { expiresIn: '1h' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CREATE EVENT
app.post('/api/events', async (req, res) => {
  const { title, description, date, location, organizerId } = req.body;
  try {
    const newEvent = new Event({
      title, description, date, location,
      organizer: organizerId
    });
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET ALL EVENTS
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find().populate('organizer', 'username');
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. DELETE EVENT (Added this back for you)
app.delete('/api/events/:id', async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. HEALTH CHECK
app.get('/', (req, res) => {
  res.send('Backend is Running!');
});

// --- START SERVER ---
// Cloud services will set their own PORT variable
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

//MONGO_URI=mongodb://127.0.0.1:27017/eventApp PORT=5000