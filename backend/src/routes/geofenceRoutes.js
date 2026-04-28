const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const{
    createGeofence,
    getGeofences,
    checkGeofenceBreach,
    deleteGeofence
} = require('../controllers/geofenceController');

router.post('/', authenticate, createGeofence);
router.get('/', authenticate, getGeofences);
router.post('/check-breach', authenticate, checkGeofenceBreach);
router.delete('/:id', authenticate, deleteGeofence);

module.exports = router;