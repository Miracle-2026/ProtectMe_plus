const pool = require('../config/database');
const { getIO } = require('../utils/socket');

const MAX_GEOFENCES = 5;

const createGeofence = async (req, res) => {
    // We do not trust the frontend. We only take the math.
    const { name, latitude, longitude, radius_meters } = req.body; 
    const guardianId = req.user.userId;

    try {
        if (!name || !latitude || !longitude || !radius_meters) {
            return res.status(400).json({ error: 'Name, location and radius are required' });
        }

        if (radius_meters < 50) {
            return res.status(400).json({ error: 'Radius must be at least 50 meters' });
        }

        const wardResult = await pool.query(
            'SELECT ward_id FROM guardian_wards WHERE guardian_id = $1 LIMIT 1',
            [guardianId]
        );

        if (wardResult.rows.length === 0) {
            return res.status(400).json({ error: 'You must link a Ward before creating a Safe Zone.' });
        }
        
        const targetWardId = wardResult.rows[0].ward_id;

        const countResult = await pool.query(
            'SELECT COUNT(*) FROM geofences WHERE guardian_id = $1',
            [guardianId]
        );

        if (parseInt(countResult.rows[0].count, 10) >= MAX_GEOFENCES) {
            return res.status(403).json({ error: `You cannot create more than ${MAX_GEOFENCES} active geofences.` });
        }

        const result = await pool.query(
            `INSERT INTO geofences
            (guardian_id, ward_id, name, center, radius_meters)
            VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)
            RETURNING id, name, radius_meters, is_active, created_at`,
            [guardianId, targetWardId, name, longitude, latitude, radius_meters]
        );

        res.status(201).json({
            message: 'Geofence created successfully',
            geofence: result.rows[0]
        });

    } catch (error) {
        console.error('Create geofence error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getGeofences = async (req, res) => {
    const guardianId = req.user.userId;

    try {
        const result = await pool.query(
            `SELECT
            id, name, radius_meters, is_active, created_at,
            ST_X(center::geometry) as longitude,
            ST_Y(center::geometry) as latitude
            FROM geofences
            WHERE guardian_id = $1
            ORDER BY created_at DESC`,
            [guardianId]
        );

        res.json({ geofences: result.rows });

    } catch (error) {
        console.error('Get geofences error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const checkGeofenceBreach = async (req, res) => {
    const { latitude, longitude } = req.body;
    const userId = req.user.userId;

    try {
        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Location is required' });
        }

        const result = await pool.query(
            `SELECT id, name, radius_meters,
            ST_Distance(center::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters
            FROM geofences
            WHERE guardian_id = $3 AND is_active = true`,
            [longitude, latitude, userId]
        );

        if (result.rows.length === 0) {
            return res.json({ breached: false, message: 'No active geofences found' });
        }

        const breaches = result.rows.filter(f => f.distance_meters > f.radius_meters);

        if (breaches.length > 0) {
            const io = getIO();
            io.to(userId).emit('geofence_breach', {
                breaches: breaches.map(f => ({
                    geofence_name: f.name,
                    distance_meters: Math.round(f.distance_meters),
                    radius_meters: f.radius_meters,
                    message: 'You have left the safe zone: ' + f.name
                }))
            });

            return res.json({
                breached: true,
                breaches: breaches.map(f => ({
                    geofence_name: f.name,
                    distance_meters: Math.round(f.distance_meters),
                    radius_meters: f.radius_meters
                }))
            });
        }

        res.json({ breached: false, message: 'Within all safe zones' });

    } catch (error) {
        console.error('Geofence check error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteGeofence = async (req, res) => {
    const { id } = req.params;
    const guardianId = req.user.userId;

    try {
        const result = await pool.query(
            `DELETE FROM geofences WHERE id = $1 AND guardian_id = $2 RETURNING id`,
            [id, guardianId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Geofence not found or not authorized' });
        }

        res.json({ message: 'Geofence deleted successfully' });

    } catch (error) {
        console.error('Delete geofence error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { createGeofence, getGeofences, checkGeofenceBreach, deleteGeofence };