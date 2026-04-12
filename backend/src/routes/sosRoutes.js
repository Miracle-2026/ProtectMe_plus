const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
    triggerSOS,
    getActiveSOSEvents,
    resolveSOSEvent
} = require('../controllers/sosController');

router.post('/trigger', authenticate, triggerSOS);
router.get('/active', authenticate, getActiveSOSEvents);
router.patch('/:id/resolve', authenticate, resolveSOSEvent);

module.exports = router;