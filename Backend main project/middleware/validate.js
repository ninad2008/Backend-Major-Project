// Input validation middleware
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }
  next();
};

const validateTransaction = (req, res, next) => {
  const { title, amount, category, type } = req.body;
  if (!title || amount === undefined || !category) {
    return res.status(400).json({ success: false, message: 'Please provide title, amount, and category' });
  }
  if (type && !['expense', 'income'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Type must be either expense or income' });
  }
  next();
};

const validateBudget = (req, res, next) => {
  const { category, limit, month } = req.body;
  if (!category || !limit || !month) {
    return res.status(400).json({ success: false, message: 'Please provide category, limit, and month (YYYY-MM)' });
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateTransaction,
  validateBudget
};
