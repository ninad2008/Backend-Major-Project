const express = require('express');
const router = express.Router();
const {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget
} = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');
const { validateBudget } = require('../middleware/validate');

router.use(protect);

router.route('/')
  .post(validateBudget, createBudget)
  .get(getBudgets);

router.route('/:id')
  .get(getBudgetById)
  .put(updateBudget);

module.exports = router;
