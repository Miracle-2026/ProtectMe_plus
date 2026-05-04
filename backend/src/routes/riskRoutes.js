const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getRiskScores } = require('../controllers/riskController');

router.get('/', authenticate, getRiskScores);

module.exports = router;