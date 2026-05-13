const pool = require('../config/database');
const crypto = require('crypto');
const { getIO } = require('../utils/socket');

const breachCache = new Map(); 
const heartbeatCache = new Map();
const ALERT_COOLDOWN_MS = 60000;
const FLATLINE_THRESHOLD_MS = 180000;
 
const generatePairingCode = async (req, res) => {
    const guardianId = req.user.userId;
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60000);

    try {
        await pool.query(
            'INSERT INTO pairing_codes (code, guardian_id, expires_at) VALUES ($1, $2, $3)',
            [code, guardianId, expiresAt]
        );
        res.status(200).json({ code });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate code' });
    }
};

const linkWard = async (req, res) => {
    const wardId = req.user.userId;
    const { code } = req.body;
    try {
        const result = await pool.query(
            'SELECT guardian_id FROM pairing_codes WHERE code = $1 AND expires_at > NOW()',
            [code]
        );
        if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired code.' });

        const guardianId = result.rows[0].guardian_id;
        await pool.query(
            'INSERT INTO guardian_wards (guardian_id, ward_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [guardianId, wardId]
        );
        await pool.query('DELETE FROM pairing_codes WHERE code = $1', [code]);
        res.status(200).json({ message: 'Linked successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Linking failed.' });
    }
};

const updateWardTelemetry = async (req, res) => {
    const { latitude, longitude } = req.body;
    const wardId = req.user.userId;

    try {

        await pool.query(
            `UPDATE users SET last_known_location = ST_SetSRID(ST_MakePoint($1, $2), 4326), 
             updated_at = NOW() WHERE id = $3`,
            [longitude, latitude, wardId]
        );

        if (!heartbeatCache.has(wardId)) {
            const gw = await pool.query('SELECT guardian_id FROM guardian_wards WHERE ward_id = $1 LIMIT 1', [wardId]);
            if (gw.rows.length > 0) {
                heartbeatCache.set(wardId, { guardianId: gw.rows[0].guardian_id, lastSeen: Date.now(), alerted: false });
            }
        } else {
            const cacheData = heartbeatCache.get(wardId);
            cacheData.lastSeen = Date.now();
            cacheData.alerted = false;
            heartbeatCache.set(wardId, cacheData);
        }

        const result = await pool.query(
            `SELECT id, name, radius_meters, guardian_id, 
             ST_Distance(center::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters 
             FROM geofences WHERE ward_id = $3 AND is_active = true`,
            [longitude, latitude, wardId]
        );

        if (result.rows.length > 0) {
            const activeGeofence = result.rows[0];
            const distance = Math.round(activeGeofence.distance_meters);

            if (distance > activeGeofence.radius_meters) {
                const now = Date.now();
                const lastAlert = breachCache.get(wardId);

                if (!lastAlert || (now - lastAlert) > ALERT_COOLDOWN_MS) {
                    getIO().to(activeGeofence.guardian_id).emit('geofence_breach', {
                        ward_id: wardId,
                        geofence_name: activeGeofence.name,
                        distance_meters: distance,
                        message: `ALERT: Ward exited safe zone: ${activeGeofence.name}`
                    });
                    breachCache.set(wardId, now);
                }
            } else {
                breachCache.delete(wardId);
            }
        }
        res.status(200).send();
    } catch (error) {
        console.error('Telemetry Error:', error.message);
        res.status(500).send();
    }
};

const startHeartbeatReaper = () => {

    setInterval(() => {
        const now = Date.now();
        for (const [wardId, data] of heartbeatCache.entries()) {
            if ((now - data.lastSeen > FLATLINE_THRESHOLD_MS) && !data.alerted) {
                getIO().to(data.guardianId).emit('signal_lost', {
                    ward_id: wardId,
                    message: 'CRITICAL: Ward signal lost. Last Known Location is recorded in the system.'
                });
                data.alerted = true;
                heartbeatCache.set(wardId, data);
            }
        }
    }, 30000);
};

module.exports = { generatePairingCode, linkWard, updateWardTelemetry, startHeartbeatReaper };