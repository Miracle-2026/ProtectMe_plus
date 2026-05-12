const express = require('express');
const router = express.Router();
const { register, login, refresh, verifyNIN } = require('../controllers/authController');
const { authenticate } = require('../middleware/authmiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/verify-nin', authenticate, verifyNIN);

module.exports = router;