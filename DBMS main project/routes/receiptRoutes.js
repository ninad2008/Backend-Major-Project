const express = require('express');
const router = express.Router();
const { scanReceipt } = require('../controllers/receiptController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/scan', scanReceipt);

module.exports = router;
