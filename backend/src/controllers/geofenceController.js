const pool = require('../config/database');
const { getIO } = require('../utils/socket');

const createGeofence = async (req, res) => {
    const { ward_id, name, latitude, longitude, radius_meters } = req.body;
    const guardianId = req.user.userId;

    try {
        if (!ward_id || !name || !latitude || !longitude || !radius_meters) {
            return res.status(400).json({
                error: 'All fields are required'
            });
        }

        if (radius_meters < 50) {
            return res.status(400).json({
                error: 'Radius must be at least 50 meters to prevent GPS drift errors'
            });
        }

        const result = await pool.query(
            `INSERT INTO geofences
            (guardian_id, ward_id, name, center, radius_meters)
            VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)
            RETURNING id, name, radius_meters, is_active, created_at`,
            [guardianId, ward_id, name, longitude, latitude, radius_meters]
        );

        res.status(201).json({
            message:'Geofence created successfully',
            geofence: result.rows[0]
        });

    } catch (error) {
        console.error('Create geofence error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getGeofences = async (req, res) => {
    const guardianId = req.user.userId;

    try{
        const result = await pool.query(
            `SELECT
            id, ward_id, name, radius_meters, is_active, created_at,
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
    const { ward_id, latitude, longitude } = req.body;
    const userId = req.user.userId;

    try{
        if(!ward_id || !latitude || !longitude) {
            return res.status(400).json({
                error: 'Ward Id and location are required'
            });
        }

        const result = await pool.query(
            'SELECT g.id, g.name, g.radius_meters, g.guardian_id, ST_Distance(g.center::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters FROM geofences g WHERE g.ward_id = $3 AND g.is_active = true',
            [longitude, latitude, ward_id]
        );

        if (result.rows.length === 0) {
            return res.json({
                breached: false,
                message: 'No active geofences found for this ward'
            });
        }

        const breaches = result.rows.filter(
            fence => fence.distance_meters > fence.radius_meters
        );

        if (breaches.length > 0) {
            const io = getIO();

            breaches.forEach(fence => {
                io.to(fence.guardian_id).emit('geofence_breach', {
                    geofence_id: fence.id,
                    geofence_name: fence.name,
                    ward_id: ward_id,
                    distance_meters: Math.round(fence.distance_meter),
                    radius_meters: fence.radius_meters,
                    message: 'Ward has left the safe zone: ' + fence.name
                });
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

        res.json({
            breached: false,
            message: 'Ward is within all safe zones'
        });

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
            `DELETE FROM geofences
            WHERE id = $1 AND guardian_id = $2
            RETURNING id`,
            [id, guardianId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Geofence not found or not authorized'
            });
        }

        res.json({ message: 'geofence deleted successfully' });

    } catch (error) {
        console.error('delete geofence error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    createGeofence,
    getGeofences,
    checkGeofenceBreach,
    deleteGeofence
};