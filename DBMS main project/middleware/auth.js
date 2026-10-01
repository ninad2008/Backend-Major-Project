const jwt = require('jsonwebtoken');
const User = require('../models/User');
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
      req.user = await User.findById(decoded.id).select('-password');
      if (req.user) {
        return next();
      }
    } catch (jwtErr) {
      // If standard JWT fails, fall through to try Firebase Admin token verification
    }

    // 2. Try Firebase ID Token verification if Firebase Admin is initialized
    if (admin && admin.apps && admin.apps.length > 0) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        let user = await User.findOne({ email: decodedToken.email });
        if (!user) {
          user = await User.create({
            name: decodedToken.name || decodedToken.email.split('@')[0],
            email: decodedToken.email,
            password: 'firebase_authenticated_user'
          });
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
