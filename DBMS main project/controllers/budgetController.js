const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const { emitBudgetAlert } = require('../utils/socket');

if (!global.inMemoryBudgets) global.inMemoryBudgets = [];
if (!global.inMemoryTransactions) global.inMemoryTransactions = [];

const calculateSpentForMonth = async (userId, category, month) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const [year, monthNum] = month.split('-').map(Number);
      const startOfMonth = new Date(year, monthNum - 1, 1);
      const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59);

      const aggregation = await Transaction.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId.toString()),
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
    } catch (err) {
      console.error('Error calculating spent:', err.message);
      return 0;
    }
  } else {
    const userTxs = global.inMemoryTransactions.filter(t =>
      t.user.toString() === userId.toString() &&
      t.category === category &&
      t.type === 'expense'
    );
    return userTxs.reduce((sum, t) => sum + t.amount, 0);
  }
};

// @desc    Create new budget
// @route   POST /api/budgets
// @access  Private
const createBudget = async (req, res) => {
  try {
    const { category, limit, month } = req.body;

    if (mongoose.connection.readyState === 1) {
      let budget = await Budget.findOne({ user: req.user._id, category, month });
      const currentSpent = await calculateSpentForMonth(req.user._id, category, month);

      if (budget) {
        budget.limit = parseFloat(limit);
        budget.spent = currentSpent;
        await budget.save();
      } else {
        budget = await Budget.create({
          user: req.user._id,
          category,
          limit: parseFloat(limit),
          spent: currentSpent,
          month
        });
      }

      if (currentSpent > budget.limit) {
        emitBudgetAlert(req.user._id, {
          budgetId: budget._id,
          category: budget.category,
          limit: budget.limit,
          spent: currentSpent,
          overspentBy: currentSpent - budget.limit,
          month: budget.month,
          message: `ALERT: Initial budget set for ${category} is already exceeded by $${(currentSpent - budget.limit).toFixed(2)}!`
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Budget saved successfully',
        data: budget
      });
    } else {
      let budget = global.inMemoryBudgets.find(b => b.user.toString() === req.user._id.toString() && b.category === category && b.month === month);
      const currentSpent = await calculateSpentForMonth(req.user._id, category, month);

      if (budget) {
        budget.limit = parseFloat(limit);
        budget.spent = currentSpent;
      } else {
        budget = {
          _id: 'bg_' + Date.now(),
          user: req.user._id,
          category,
          limit: parseFloat(limit),
          spent: currentSpent,
          month
        };
        global.inMemoryBudgets.push(budget);
      }

      if (currentSpent > budget.limit) {
        emitBudgetAlert(req.user._id, {
          budgetId: budget._id,
          category: budget.category,
          limit: budget.limit,
          spent: currentSpent,
          overspentBy: currentSpent - budget.limit,
          month: budget.month,
          message: `ALERT: Initial budget set for ${category} is already exceeded by $${(currentSpent - budget.limit).toFixed(2)}!`
        });
      }

      return res.status(201).json({ success: true, message: 'Budget saved (Cloud Mode)', data: budget });
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
      
      // Recalculate spent for accuracy
      for (let bg of budgets) {
        bg.spent = await calculateSpentForMonth(req.user._id, bg.category, bg.month);
        await bg.save();
      }

      return res.status(200).json({ success: true, count: budgets.length, data: budgets });
    } else {
      const bgs = global.inMemoryBudgets.filter(b => b.user.toString() === req.user._id.toString());
      for (let bg of bgs) {
        bg.spent = await calculateSpentForMonth(req.user._id, bg.category, bg.month);
      }
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
      const bg = global.inMemoryBudgets.find(b => b._id === req.params.id);
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
      if (limit !== undefined) budget.limit = parseFloat(limit);
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
      const idx = global.inMemoryBudgets.findIndex(b => b._id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Budget not found' });
      global.inMemoryBudgets[idx] = { ...global.inMemoryBudgets[idx], ...req.body };
      global.inMemoryBudgets[idx].spent = await calculateSpentForMonth(req.user._id, global.inMemoryBudgets[idx].category, global.inMemoryBudgets[idx].month);
      return res.status(200).json({ success: true, message: 'Budget updated', data: global.inMemoryBudgets[idx] });
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
