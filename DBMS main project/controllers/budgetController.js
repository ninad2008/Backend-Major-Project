const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { emitBudgetAlert } = require('../utils/socket');

// Helper to calculate total spent for budget initial creation
const calculateSpentForMonth = async (userId, category, month) => {
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

    // Check if budget already exists for category & month
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

    // Socket.io Real-Time Alert check
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

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: budget
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all budgets for user
// @route   GET /api/budgets
// @access  Private
const getBudgets = async (req, res) => {
  try {
    const { month } = req.query;
    let query = { user: req.user._id };

    if (month) {
      query.month = month;
    }

    const budgets = await Budget.find(query).sort({ month: -1, category: 1 });
    res.status(200).json({ success: true, count: budgets.length, data: budgets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single budget by ID
// @route   GET /api/budgets/:id
// @access  Private
const getBudgetById = async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update budget limit or details
// @route   PUT /api/budgets/:id
// @access  Private
const updateBudget = async (req, res) => {
  try {
    let budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    const { limit, category, month } = req.body;
    if (limit !== undefined) budget.limit = limit;
    if (category) budget.category = category;
    if (month) budget.month = month;

    // Recalculate spent for updated parameters
    budget.spent = await calculateSpentForMonth(req.user._id, budget.category, budget.month);
    await budget.save();

    // Trigger Socket.io alert if updated limit is exceeded
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

    res.status(200).json({ success: true, message: 'Budget updated successfully', data: budget });
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
