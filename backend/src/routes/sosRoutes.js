const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
    triggerSOS,
    getActiveSOSEvents,
    resolveSOSEvent,
    logHeartbeat,
    respondToSOS
} = require('../controllers/sosController');

router.post('/trigger', authenticate, triggerSOS);
router.get('/active', authenticate, getActiveSOSEvents);
router.patch('/:id/resolve', authenticate, resolveSOSEvent);
router.post('/heartbeat', authenticate, logHeartbeat);
router.post('/respond', authenticate, respondToSOS);

module.exports = router;