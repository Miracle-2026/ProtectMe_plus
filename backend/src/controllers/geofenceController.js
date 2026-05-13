const pool = require('../config/database');
const { getIO } = require('../utils/socket');

const MAX_GEOFENCES = 5;

const createGeofence = async (req, res) => {
    const { name, latitude, longitude, radius_meters } = req.body; 
    const guardianId = req.user.userId;

    try {
        if (!name || !latitude || !longitude || !radius_meters) {
            return res.status(400).json({ error: 'All fields required' });
        }

        const wardResult = await pool.query(
            'SELECT ward_id FROM guardian_wards WHERE guardian_id = $1 LIMIT 1',
            [guardianId]
        );

        if (wardResult.rows.length === 0) {
            return res.status(400).json({ error: 'No linked Ward found for this account.' });
        }
        
        const targetWardId = wardResult.rows[0].ward_id;

        const result = await pool.query(
            `INSERT INTO geofences
            (guardian_id, ward_id, name, center, radius_meters)
            VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)
            RETURNING id, name, radius_meters, is_active`,
            [guardianId, targetWardId, name, longitude, latitude, radius_meters]
        );

        res.status(201).json({ message: 'Safe Zone created', geofence: result.rows[0] });
    } catch (error) {
        console.error('Create geofence error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getGeofences = async (req, res) => {
    const guardianId = req.user.userId;
    try {
        const result = await pool.query(
            `SELECT id, name, radius_meters, is_active, 
            ST_X(center::geometry) as longitude, ST_Y(center::geometry) as latitude
            FROM geofences WHERE guardian_id = $1 ORDER BY created_at DESC`,
            [guardianId]
        );
        res.json({ geofences: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const checkGeofenceBreach = async (req, res) => {
    const { latitude, longitude } = req.body;
    const wardId = req.user.userId;

    try {
        const result = await pool.query(
            `SELECT id, name, radius_meters, guardian_id,
            ST_Distance(center::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters
            FROM geofences
            WHERE ward_id = $3 AND is_active = true`,
            [longitude, latitude, wardId]
        );

        if (result.rows.length === 0) return res.status(200).send();

        const io = getIO();
        result.rows.forEach(f => {
            if (f.distance_meters > f.radius_meters) {
                io.to(f.guardian_id).emit('geofence_breach', {
                    geofence_name: f.name,
                    distance_meters: Math.round(f.distance_meters),
                    location: {
                        latitude: latitude,
                        longitude: longitude
                    },
                    message: `Ward has exited Safe Zone: ${f.name}`
                });
            }
        });

        res.status(200).send();
    } catch (error) {
        console.error('Breach check error:', error.message);
        res.status(500).send();
    }
};

const deleteGeofence = async (req, res) => {
    const { id } = req.params;
    const guardianId = req.user.userId;
    try {
        await pool.query('DELETE FROM geofences WHERE id = $1 AND guardian_id = $2', [id, guardianId]);
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).send();
    }
};

module.exports = { createGeofence, getGeofences, checkGeofenceBreach, deleteGeofence };