const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  limit: {
    type: Number,
    required: [true, 'Budget limit is required']
  },
  spent: {
    type: Number,
    default: 0
  },
  month: {
    type: String, // Format: "YYYY-MM" e.g., "2026-09"
    required: [true, 'Month format YYYY-MM is required']
  }
}, { timestamps: true });

// Ensure unique budget per category per user per month
BudgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', BudgetSchema);
