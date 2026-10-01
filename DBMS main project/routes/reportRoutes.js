const express = require('express');
const router = express.Router();
const {
  getMonthlyReport,
  getCategoryReport,
  getYearlyReport,
  getForecast
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/monthly', getMonthlyReport);
router.get('/category', getCategoryReport);
router.get('/yearly', getYearlyReport);
router.get('/forecast', getForecast);

module.exports = router;
