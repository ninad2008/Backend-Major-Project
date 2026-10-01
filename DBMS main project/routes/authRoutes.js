const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validate');

router.post('/register', validateRegister, registerUser);
router.post('/login', validateLogin, loginUser);

module.exports = router;
