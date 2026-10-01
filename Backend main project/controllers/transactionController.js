const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const mongoose = require('mongoose');
const { emitBudgetAlert } = require('../utils/socket');

// Global in-memory storage for fallback cloud preview mode
if (!global.inMemoryTransactions) global.inMemoryTransactions = [];
if (!global.inMemoryBudgets) global.inMemoryBudgets = [];

// Helper to calculate total spent for a user in a specific month & category
const updateBudgetSpent = async (userId, category, dateStr) => {
  const dateObj = new Date(dateStr || Date.now());
  const year = dateObj.getFullYear();
  const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
  const monthFormat = `${year}-${monthNum}`;

  if (mongoose.connection.readyState === 1) {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId.toString());
      const startOfMonth = new Date(year, dateObj.getMonth(), 1);
      const endOfMonth = new Date(year, dateObj.getMonth() + 1, 0, 23, 59, 59);

      const totalExpense = await Transaction.aggregate([
        {
          $match: {
            user: userObjectId,
            category: category,
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
      const budget = await Budget.findOne({ user: userObjectId, category, month: monthFormat });
      
      if (budget) {
        budget.spent = spentAmount;
        await budget.save();

        emitBudgetAlert(userId, {
          budgetId: budget._id,
          category: budget.category,
          limit: budget.limit,
          spent: spentAmount,
          overspentBy: spentAmount > budget.limit ? spentAmount - budget.limit : 0,
          month: budget.month,
          isExceeded: spentAmount > budget.limit,
          message: spentAmount > budget.limit
            ? `ALERT: You have exceeded your budget for ${budget.category} by $${(spentAmount - budget.limit).toFixed(2)}!`
            : `Budget Update: ${budget.category} spent $${spentAmount.toFixed(2)} / $${budget.limit.toFixed(2)}`
        });
      }
    } catch (err) {
      console.error('Error updating budget spent:', err.message);
    }
  } else {
    // In-memory fallback calculation
    const userTxs = global.inMemoryTransactions.filter(t =>
      t.user.toString() === userId.toString() &&
      t.category === category &&
      t.type === 'expense'
    );
    const spentAmount = userTxs.reduce((sum, t) => sum + t.amount, 0);

    const bg = global.inMemoryBudgets.find(b => b.user.toString() === userId.toString() && b.category === category);
    if (bg) {
      bg.spent = spentAmount;
      emitBudgetAlert(userId, {
        budgetId: bg._id,
        category: bg.category,
        limit: bg.limit,
        spent: spentAmount,
        overspentBy: spentAmount > bg.limit ? spentAmount - bg.limit : 0,
        month: bg.month,
        isExceeded: spentAmount > bg.limit,
        message: spentAmount > bg.limit
          ? `ALERT: You have exceeded your budget for ${bg.category} by $${(spentAmount - bg.limit).toFixed(2)}!`
          : `Budget Update: ${bg.category} spent $${spentAmount.toFixed(2)} / $${bg.limit.toFixed(2)}`
      });
    }
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const { title, amount, type, category, date, notes } = req.body;

    if (mongoose.connection.readyState === 1) {
      const transaction = await Transaction.create({
        user: req.user._id,
        title,
        amount: parseFloat(amount),
        type: type || 'expense',
        category,
        date: date || Date.now(),
        notes
      });

      if (transaction.type === 'expense') {
        await updateBudgetSpent(req.user._id, transaction.category, transaction.date);
      }

      return res.status(201).json({
        success: true,
        message: 'Transaction recorded successfully',
        data: transaction
      });
    } else {
      // In-memory fallback
      const tx = {
        _id: 'tx_' + Date.now(),
        user: req.user._id,
        title,
        amount: parseFloat(amount),
        type: type || 'expense',
        category,
        date: date || new Date().toISOString(),
        notes
      };
      global.inMemoryTransactions.unshift(tx);

      if (tx.type === 'expense') {
        await updateBudgetSpent(req.user._id, tx.category, tx.date);
      }

      return res.status(201).json({
        success: true,
        message: 'Transaction recorded (Cloud Mode)',
        data: tx
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all transactions for logged in user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
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

      return res.status(200).json({
        success: true,
        count: transactions.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: transactions
      });
    } else {
      const userTxs = global.inMemoryTransactions.filter(t => t.user.toString() === req.user._id.toString());
      return res.status(200).json({
        success: true,
        count: userTxs.length,
        total: userTxs.length,
        page: 1,
        pages: 1,
        data: userTxs
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
      if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
      return res.status(200).json({ success: true, data: transaction });
    } else {
      const tx = global.inMemoryTransactions.find(t => t._id === req.params.id);
      if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
      return res.status(200).json({ success: true, data: tx });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
      if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

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

      return res.status(200).json({ success: true, message: 'Transaction updated successfully', data: transaction });
    } else {
      const idx = global.inMemoryTransactions.findIndex(t => t._id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Transaction not found' });
      global.inMemoryTransactions[idx] = { ...global.inMemoryTransactions[idx], ...req.body };
      await updateBudgetSpent(req.user._id, global.inMemoryTransactions[idx].category, global.inMemoryTransactions[idx].date);
      return res.status(200).json({ success: true, message: 'Transaction updated', data: global.inMemoryTransactions[idx] });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
      if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

      const { category, date, type } = transaction;
      await transaction.deleteOne();

      if (type === 'expense') {
        await updateBudgetSpent(req.user._id, category, date);
      }

      return res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
    } else {
      const idx = global.inMemoryTransactions.findIndex(t => t._id === req.params.id);
      if (idx !== -1) {
        const tx = global.inMemoryTransactions[idx];
        global.inMemoryTransactions.splice(idx, 1);
        await updateBudgetSpent(req.user._id, tx.category, tx.date);
      }
      return res.status(200).json({ success: true, message: 'Transaction deleted' });
    }
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
