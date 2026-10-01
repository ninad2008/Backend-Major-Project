const express = require('express');
const router = express.Router();
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const { validateTransaction } = require('../middleware/validate');

router.use(protect);

router.route('/')
  .post(validateTransaction, createTransaction)
  .get(getTransactions);

router.route('/:id')
  .get(getTransactionById)
  .put(updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
