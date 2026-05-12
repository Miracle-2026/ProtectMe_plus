const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const{
    createGeofence,
    getGeofences,
    checkGeofenceBreach,
    deleteGeofence
} = require('../controllers/geofenceController');
const { generatePairingCode, linkWard, updateWardTelemetry } = require('../controllers/wardController');

router.post('/', authenticate, createGeofence);
router.get('/', authenticate, getGeofences);
router.post('/check-breach', authenticate, checkGeofenceBreach);
router.delete('/:id', authenticate, deleteGeofence);
router.post('/ward/generate-code', authenticate, generatePairingCode);
router.post('/ward/link', authenticate, linkWard);
router.post('/ward/telemetry', authenticate, updateWardTelemetry);

module.exports = router;