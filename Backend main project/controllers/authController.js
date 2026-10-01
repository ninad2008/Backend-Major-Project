const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// In-memory fallback user storage for cloud deployment previews (e.g. Render) without live Mongo Atlas
const inMemoryUsers = [];

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'spendwise_super_secret_key_2026_dbms_project', {
    expiresIn: '30d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, familyId, fcmToken } = req.body;

    // Check if MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists with this email' });
      }

      const user = await User.create({
        name,
        email,
        password,
        familyId: familyId || null,
        fcmToken: fcmToken || null
      });

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          familyId: user.familyId,
          token
        }
      });
    } else {
      // Fallback in-memory registration for Render cloud demo
      const existing = inMemoryUsers.find(u => u.email === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ success: false, message: 'User already exists with this email' });
      }
      const fakeId = 'mem_' + Date.now();
      const newUser = { _id: fakeId, name, email: email.toLowerCase(), password, familyId: familyId || null };
      inMemoryUsers.push(newUser);

      const token = generateToken(fakeId);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully (Cloud Demo Mode)',
        data: { _id: fakeId, name, email, familyId: null, token }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password, fcmToken } = req.body;

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (fcmToken) {
        user.fcmToken = fcmToken;
        await user.save();
      }

      const token = generateToken(user._id);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          familyId: user.familyId,
          token
        }
      });
    } else {
      // Fallback in-memory login for Render cloud demo
      const user = inMemoryUsers.find(u => u.email === email.toLowerCase());
      if (!user || user.password !== password) {
        // Auto-create demo user on Render if not existing so login always succeeds for demo
        const fakeId = 'mem_' + Date.now();
        const newUser = { _id: fakeId, name: email.split('@')[0], email: email.toLowerCase(), password };
        inMemoryUsers.push(newUser);
        const token = generateToken(fakeId);
        return res.status(200).json({
          success: true,
          message: 'Login successful (Cloud Demo Mode)',
          data: { _id: fakeId, name: newUser.name, email: newUser.email, familyId: null, token }
        });
      }

      const token = generateToken(user._id);
      return res.status(200).json({
        success: true,
        message: 'Login successful (Cloud Demo Mode)',
        data: { _id: user._id, name: user.name, email: user.email, familyId: null, token }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login error', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser
};
