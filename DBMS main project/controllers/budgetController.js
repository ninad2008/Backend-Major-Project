const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const { emitBudgetAlert } = require('../utils/socket');

const inMemoryBudgets = [];

const calculateSpentForMonth = async (userId, category, month) => {
  if (mongoose.connection.readyState !== 1) return 0;

  const [year, monthNum] = month.split('-').map(Number);
  const startOfMonth = new Date(year, monthNum - 1, 1);
  const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59);

  const aggregation = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        category,
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  return aggregation.length > 0 ? aggregation[0].total : 0;
};

// @desc    Create new budget
// @route   POST /api/budgets
// @access  Private
const createBudget = async (req, res) => {
  try {
    const { category, limit, month } = req.body;

    if (mongoose.connection.readyState === 1) {
      let budget = await Budget.findOne({ user: req.user._id, category, month });
      if (budget) {
        return res.status(400).json({
          success: false,
          message: `Budget already exists for ${category} in ${month}. Use PUT to update.`
        });
      }

      const currentSpent = await calculateSpentForMonth(req.user._id, category, month);

      budget = await Budget.create({
        user: req.user._id,
        category,
        limit,
        spent: currentSpent,
        month
      });

      if (currentSpent > limit) {
        emitBudgetAlert(req.user._id, {
          budgetId: budget._id,
          category: budget.category,
          limit: budget.limit,
          spent: currentSpent,
          overspentBy: currentSpent - limit,
          month: budget.month,
          message: `ALERT: Initial budget set for ${category} is already exceeded by $${(currentSpent - limit).toFixed(2)}!`
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Budget created successfully',
        data: budget
      });
    } else {
      let budget = inMemoryBudgets.find(b => b.user === req.user._id && b.category === category && b.month === month);
      if (budget) {
        budget.limit = parseFloat(limit);
      } else {
        budget = {
          _id: 'bg_' + Date.now(),
          user: req.user._id,
          category,
          limit: parseFloat(limit),
          spent: 0,
          month
        };
        inMemoryBudgets.push(budget);
      }
      return res.status(201).json({ success: true, message: 'Budget created (Cloud Mode)', data: budget });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all budgets for user
// @route   GET /api/budgets
// @access  Private
const getBudgets = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const { month } = req.query;
      let query = { user: req.user._id };
      if (month) query.month = month;

      const budgets = await Budget.find(query).sort({ month: -1, category: 1 });
      return res.status(200).json({ success: true, count: budgets.length, data: budgets });
    } else {
      const bgs = inMemoryBudgets.filter(b => b.user === req.user._id);
      return res.status(200).json({ success: true, count: bgs.length, data: bgs });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single budget by ID
// @route   GET /api/budgets/:id
// @access  Private
const getBudgetById = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
      if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
      return res.status(200).json({ success: true, data: budget });
    } else {
      const bg = inMemoryBudgets.find(b => b._id === req.params.id);
      if (!bg) return res.status(404).json({ success: false, message: 'Budget not found' });
      return res.status(200).json({ success: true, data: bg });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update budget limit or details
// @route   PUT /api/budgets/:id
// @access  Private
const updateBudget = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
      if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });

      const { limit, category, month } = req.body;
      if (limit !== undefined) budget.limit = limit;
      if (category) budget.category = category;
      if (month) budget.month = month;

      budget.spent = await calculateSpentForMonth(req.user._id, budget.category, budget.month);
      await budget.save();

      if (budget.spent > budget.limit) {
        emitBudgetAlert(req.user._id, {
          budgetId: budget._id,
          category: budget.category,
          limit: budget.limit,
          spent: budget.spent,
          overspentBy: budget.spent - budget.limit,
          month: budget.month,
          message: `ALERT: Updated budget for ${budget.category} is exceeded by $${(budget.spent - budget.limit).toFixed(2)}!`
        });
      }

      return res.status(200).json({ success: true, message: 'Budget updated successfully', data: budget });
    } else {
      const idx = inMemoryBudgets.findIndex(b => b._id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Budget not found' });
      inMemoryBudgets[idx] = { ...inMemoryBudgets[idx], ...req.body };
      return res.status(200).json({ success: true, message: 'Budget updated', data: inMemoryBudgets[idx] });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget
};
