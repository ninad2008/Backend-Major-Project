const { admin } = require('../config/firebase');
const User = require('../models/User');

// @desc    Send push notification via Firebase FCM
// @route   POST /api/notifications/send
// @access  Private
const sendNotification = async (req, res) => {
  try {
    const { title, body, fcmToken, data } = req.body;

    let targetToken = fcmToken;
    if (!targetToken) {
      const user = await User.findById(req.user._id);
      targetToken = user.fcmToken;
    }

    const payload = {
      notification: {
        title: title || 'SpendWise Alert',
        body: body || 'You have a new update regarding your expenses.'
      },
      data: data || { type: 'BUDGET_ALERT' }
    };

    if (admin && admin.apps && admin.apps.length > 0 && targetToken) {
      try {
        const response = await admin.messaging().send({
          token: targetToken,
          notification: payload.notification,
          data: payload.data
        });

        return res.status(200).json({
          success: true,
          message: 'Firebase push notification sent successfully',
          messageId: response
        });
      } catch (fcmErr) {
        return res.status(200).json({
          success: true,
          status: 'simulated',
          message: 'Firebase credentials active, but target device token was invalid or unregistered',
          error: fcmErr.message,
          payload
        });
      }
    }

    // Standard response when testing locally without an active mobile token
    res.status(200).json({
      success: true,
      status: 'simulated',
      message: 'Push notification processed (no active device token provided)',
      payload
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  sendNotification
};
