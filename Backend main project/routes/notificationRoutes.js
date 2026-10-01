const express = require('express');
const router = express.Router();
const { sendNotification } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/send', sendNotification);

module.exports = router;
