const Category = require('../models/Category');

// Default global categories
const defaultCategories = [
  { name: 'Food & Dining', type: 'expense', icon: 'utensils' },
  { name: 'Groceries', type: 'expense', icon: 'shopping-cart' },
  { name: 'Rent & Utilities', type: 'expense', icon: 'home' },
  { name: 'Transportation', type: 'expense', icon: 'car' },
  { name: 'Entertainment', type: 'expense', icon: 'film' },
  { name: 'Shopping', type: 'expense', icon: 'shopping-bag' },
  { name: 'Healthcare', type: 'expense', icon: 'heart' },
  { name: 'Salary', type: 'income', icon: 'wallet' },
  { name: 'Investments', type: 'income', icon: 'chart-line' },
  { name: 'Freelance', type: 'income', icon: 'laptop' }
];

// @desc    Get all categories (system defaults + user custom)
// @route   GET /api/categories
// @access  Private
const getCategories = async (req, res) => {
  try {
    const userCategories = await Category.find({
      $or: [{ user: null }, { user: req.user._id }]
    }).sort({ name: 1 });

    // If no categories exist at all in DB, insert defaults
    if (userCategories.length === 0) {
      await Category.insertMany(defaultCategories);
      const freshlyInserted = await Category.find({
        $or: [{ user: null }, { user: req.user._id }]
      }).sort({ name: 1 });
      return res.status(200).json({ success: true, count: freshlyInserted.length, data: freshlyInserted });
    }

    res.status(200).json({ success: true, count: userCategories.length, data: userCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create custom user category
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
  try {
    const { name, type, icon } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const category = await Category.create({
      name,
      type: type || 'expense',
      icon: icon || 'tag',
      user: req.user._id
    });

    res.status(201).json({ success: true, message: 'Category created successfully', data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getCategories,
  createCategory
};
