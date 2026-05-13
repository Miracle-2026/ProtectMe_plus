const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authmiddleware');
const { getSettings, updateSettings } = require('../controllers/settingsController');

router.get('/', authenticate, getSettings);

router.put('/', authenticate, updateSettings);

module.exports = router;