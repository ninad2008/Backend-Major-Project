const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { emitBudgetAlert } = require('../utils/socket');

// Helper to calculate total spent for a user in a specific month & category
const updateBudgetSpent = async (userId, category, dateStr) => {
  const dateObj = new Date(dateStr);
  const year = dateObj.getFullYear();
  const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
  const monthFormat = `${year}-${monthNum}`;

  // Find active budget for this user, category, and month
  const budget = await Budget.findOne({ user: userId, category, month: monthFormat });
  if (!budget) return;

  // Calculate sum of expenses for this category in this month
  const startOfMonth = new Date(year, dateObj.getMonth(), 1);
  const endOfMonth = new Date(year, dateObj.getMonth() + 1, 0, 23, 59, 59);

  const totalExpense = await Transaction.aggregate([
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

  const spentAmount = totalExpense.length > 0 ? totalExpense[0].total : 0;
  budget.spent = spentAmount;
  await budget.save();

  // Socket.io Real-time alert if spent > limit
  if (spentAmount > budget.limit) {
    emitBudgetAlert(userId, {
      budgetId: budget._id,
      category: budget.category,
      limit: budget.limit,
      spent: spentAmount,
      overspentBy: spentAmount - budget.limit,
      month: budget.month,
      message: `ALERT: You have exceeded your budget for ${budget.category} by $${(spentAmount - budget.limit).toFixed(2)}!`
    });
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const { title, amount, type, category, date, notes } = req.body;

    const transaction = await Transaction.create({
      user: req.user._id,
      title,
      amount,
      type: type || 'expense',
      category,
      date: date || Date.now(),
      notes
    });

    // If it's an expense, sync with budget and check real-time Socket.io limits
    if (transaction.type === 'expense') {
      await updateBudgetSpent(req.user._id, transaction.category, transaction.date);
    }

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all transactions for logged in user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const { type, category, startDate, endDate, limit, page } = req.query;

    let query = { user: req.user._id };

    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    let transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const oldCategory = transaction.category;
    const oldDate = transaction.date;

    transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (transaction.type === 'expense') {
      await updateBudgetSpent(req.user._id, transaction.category, transaction.date);
      if (oldCategory !== transaction.category) {
        await updateBudgetSpent(req.user._id, oldCategory, oldDate);
      }
    }

    res.status(200).json({ success: true, message: 'Transaction updated successfully', data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const { category, date, type } = transaction;

    await transaction.deleteOne();

    if (type === 'expense') {
      await updateBudgetSpent(req.user._id, category, date);
    }

    res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction
};
