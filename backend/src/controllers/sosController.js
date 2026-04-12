const pool = require('../config/database');
const dotenv = require('dotenv');

dotenv.config();

const triggerSOS = async (req, res) => {
    const { threat_type, latitude, longitude, address } = req.body;
    const userId = req.user.userId;

    try{
        if (!threat_type || !latitude || !longitude) {
            return res.status(400).json({
                error: 'Threat type and location are required'
            })
        }

        if (!['ARMED', 'UNARMED'].includes(threat_type)) {
            return res.status(400).json({
                error: 'Threat type must be either ARMED or UNARMED'
            });
        }

        const protocol = threat_type === 'ARMED'
        ? 'OBSERVATION'
        : 'INTERVENTION';

        const result = await pool.query(
            `INSERT INTO sos_events
            (user_id, threat_type, protocol, location, address)
            VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)
            RETURNING id, threat_type, protocol, address, status, created_at`,
            [userId, threat_type, protocol, longitude, latitude, address]
        );
        const sosEvent = result.rows[0];

        const nearbyResponders = await pool.query(
            `SELECT u.id, u.phone_number, u.full_name
            FROM users u
            WHERE u.id != $1
            AND u.is_active = true
            LIMIT 10`,
            [userId]
        );

        res.status(201).json({
            message: `SOS triggered. ${protocol} protocol activated.`,
            sos: sosEvent,
            protocol_instruction: protocol === 'OBSERVATION'
            ? 'Threat is armed. DO NOT approach. Document evidence only.'
            :'Threat is unarmed. Community intervention requested.',
            responders_notified: nearbyResponders.rows.length
        });

    }catch (error) {
        console.error('SOS trigger error:', error.message);
        res.status(500).json({ error: 'Internal server error'});
    }
};

const getActiveSOSEvents = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
            s.id,
            s.threat_type,
            s.protocol,
            s.address,
            s.status,
            s.created_at,
            ST_X(s.location::geometry) as longitude,
            ST_Y(s.location::geometry) as latitude
            FROM sos_events s
            WHERE s.status = 'ACTIVE'
            ORDER BY s.created_at DESC`
        );

        res.json({
            active_sos_events: result.rows
        });

    }catch (error) {
        console.error('Get SOS error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const resolveSOSEvent = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try{
        const result = await pool.query(
            `UPDATE sos_events
            SET status = 'RESOLVED', resolved_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING id, status, resolved_at`,
            [id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'SOS event not found or you are not authorized to resolve it'
            });
        }

        res.json({
            message: 'SOS event resolved',
            sos: result.rows[0]
        });

    } catch (error) {
        console.error('Resolve SOS error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { triggerSOS, getActiveSOSEvents, resolveSOSEvent };