const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const { admin } = require('../config/firebase');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  try {
    // 1. Try standard JWT verification
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'spendwise_super_secret_key_2026_dbms_project');
      
      if (mongoose.connection.readyState === 1) {
        req.user = await User.findById(decoded.id).select('-password');
      }
      
      // Fallback user context if DB is in fallback mode or memory ID
      if (!req.user) {
        req.user = {
          _id: decoded.id,
          name: 'Demo User',
          email: 'user@example.com'
        };
      }

      return next();
    } catch (jwtErr) {
      // Pass through if JWT fails
    }

    // 2. Try Firebase ID Token verification
    if (admin && admin.apps && admin.apps.length > 0) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        let user = null;
        if (mongoose.connection.readyState === 1) {
          user = await User.findOne({ email: decodedToken.email });
        }
        if (!user) {
          user = {
            _id: decodedToken.uid || 'fb_' + Date.now(),
            name: decodedToken.name || decodedToken.email.split('@')[0],
            email: decodedToken.email
          };
        }
        req.user = user;
        return next();
      } catch (fbErr) {
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
      }
    }

    return res.status(401).json({ success: false, message: 'Token verification failed' });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed', error: error.message });
  }
};

module.exports = { protect };
