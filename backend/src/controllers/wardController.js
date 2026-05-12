const pool = require('../config/database');
const crypto = require('crypto');
const { getIO } = require('../utils/socket');

const breachCache = new Map(); 
const heartbeatCache = new Map();
const ALERT_COOLDOWN_MS = 60000;
const FLATLINE_THRESHOLD_MS = 180000;

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

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
        console.error('Pairing generation error:', error.message);
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

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired pairing code.' });
        }

        const guardianId = result.rows[0].guardian_id;

        await pool.query(
            'INSERT INTO guardian_wards (guardian_id, ward_id) VALUES ($1, $2)',
            [guardianId, wardId]
        );

        await pool.query('DELETE FROM pairing_codes WHERE code = $1', [code]);

        res.status(200).json({ message: 'Device successfully linked to Guardian.' });
    } catch (error) {
        console.error('Linking error:', error.message);
        res.status(500).json({ error: 'Failed to link account.' });
    }
};

const updateWardTelemetry = async (req, res) => {
    const { latitude, longitude } = req.body;
    const wardId = req.user.userId;

    try {
        const lastPos = await pool.query('SELECT last_lat, last_lng, updated_at FROM ward_lkl WHERE ward_id = $1', [wardId]);
        
        if (lastPos.rows.length > 0) {
            const dist = calculateDistance(lastPos.rows[0].last_lat, lastPos.rows[0].last_lng, latitude, longitude);
            const timeDiff = (Date.now() - new Date(lastPos.rows[0].updated_at)) / 1000;

            if (timeDiff > 0 && dist / timeDiff > 80) { 
                console.warn(`🚨 [ANTI-SPOOF] Rejected anomaly for Ward ${wardId}`);
                return res.status(403).json({ error: "Location anomaly detected." });
            }
        }

        await pool.query(
            'INSERT INTO ward_lkl (ward_id, last_lat, last_lng, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (ward_id) DO UPDATE SET last_lat=$2, last_lng=$3, updated_at=NOW()',
            [wardId, latitude, longitude]
        );

        if (!heartbeatCache.has(wardId)) {
            const gw = await pool.query('SELECT guardian_id FROM guardian_wards WHERE ward_id = $1 LIMIT 1', [wardId]);
            if (gw.rows.length > 0) {
                heartbeatCache.set(wardId, { guardianId: gw.rows[0].guardian_id, lastSeen: Date.now(), alerted: false });
            }
        } else {
            const cacheData = heartbeatCache.get(wardId);
            cacheData.lastSeen = Date.now();
            if (cacheData.alerted) {
                console.log(`💚 [SIGNAL RESTORED] Ward ${wardId} is back online.`);
                cacheData.alerted = false; 
            }
            heartbeatCache.set(wardId, cacheData);
        }

        const result = await pool.query(
            `SELECT id, name, radius_meters, guardian_id,
            ST_Distance(center::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters
            FROM geofences
            WHERE ward_id = $3 AND is_active = true`,
            [longitude, latitude, wardId]
        );

        if (result.rows.length === 0) {

            return res.status(200).send();
        }

        const activeGeofence = result.rows[0];
        const distance = Math.round(activeGeofence.distance_meters);
 
        if (distance > activeGeofence.radius_meters) {
            const lastAlertTime = breachCache.get(wardId);
            const now = Date.now();

            if (!lastAlertTime || (now - lastAlertTime) > ALERT_COOLDOWN_MS) {
        
                const io = getIO();
                io.to(activeGeofence.guardian_id).emit('geofence_breach', {
                    ward_id: wardId,
                    geofence_name: activeGeofence.name,
                    distance_meters: distance,
                    message: `ALERT: Ward has left the safe zone: ${activeGeofence.name}`
                });

                breachCache.set(wardId, now);

            }
        } else {

             breachCache.delete(wardId); 
        }

        res.status(200).send();

    } catch (error) {
        console.error('Telemetry processing error:', error.message);
        res.status(500).send();
    }
};

const startHeartbeatReaper = () => {
    console.log("💀 Dead Man's Switch: Armed.");

    setInterval(() => {
        const now = Date.now();
        for (const [wardId, data] of heartbeatCache.entries()) {
            if ((now - data.lastSeen > FLATLINE_THRESHOLD_MS) && !data.alerted) {
                console.log(`\n🚨 [FLATLINE DETECTED] Ward ${wardId} offline!`);
                const io = getIO();
                io.to(data.guardianId).emit('signal_lost', {
                    ward_id: wardId,
                    message: 'CRITICAL: Communication with Ward device lost.'
                });
                
                data.alerted = true;
                heartbeatCache.set(wardId, data);
            }
        }
    }, 30000);
};

module.exports = { generatePairingCode, linkWard, updateWardTelemetry, startHeartbeatReaper };