const pool = require('../config/database');
const { getIO } = require('../utils/socket');
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

        const contactsResult = await pool.query(
            'SELECT contact_name, contact_phone FROM emergency_contacts WHERE user_id = $1 AND IS_primary = true LIMIT 1',
            [userId]
        );
        
        if (contactsResult.rows.length > 0) {
            const primaryContact = contactsResult.rows[0];
            console.log(`ALERT: Notifying primary contact ${primaryContact.contact_name} at ${primaryContact.contact_phone}`);
        }
        
        const nearbyResponders = await pool.query(
            `SELECT u.id, u.phone_number, u.full_name
            FROM users u
            WHERE u.id != $1
            AND u.is_active = true
            LIMIT 10`,
            [userId]
        );
        const io = getIO();

        nearbyResponders.rows.forEach((responder) =>{
            io.to(responder.id).emit('sos_alert', {
                sosId: sosEvent.id,
                threat_type: sosEvent.threat_type,
                protocol: sosEvent.protocol,
                protocol_instruction: protocol === 'OBSERVATION'
                ? 'Threat is armed. DO NOT approach. Document evidence only.'
                : 'Threat is unarmed. Community intervention requested.',
                address: sosEvent.address,
                created_at: sosEvent.created_at
            });
        });

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
    const userId = req.user.userId;

    try {
        const result = await pool.query(
            'SELECT id, user_id, threat_type, protocol, address, status, created_at, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude FROM sos_events WHERE status = $1 ORDER BY created_at DESC',
            ['ACTIVE']
        );

        const events = result.rows.map(event => {
            const isOwnSOS = event.user_id === userId;
            if (!isOwnSOS) {
                return {
                    id: event.id,
                    threat_type: event.threat_type,
                    protocol: event.protocol,
                    address: event.address,
                    status: event.status,
                    created_at: event.created_at,
                    latitude: parseFloat(Number(event.latitude).toFixed(2)),
                    longitude: parseFloat(Number(event.longitude).toFixed(2)),
                    is_own_sos: false
                };
            }
            return {
                id: event.id,
                threat_type: event.threat_type,
                protocol: event.protocol,
                address: event.address,
                status: event.status,
                created_at: event.created_at,
                latitude: parseFloat(event.latitude),
                longitude: parseFloat(event.longitude),
                is_own_sos: true
            };
        });

        res.json({ active_sos_events: events });

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

const logHeartbeat = async (req, res) => {
    const { sos_event_id, latitude, longitude } = req.body;
    const userId = req.user.userId;

    try{
        if (!sos_event_id || !latitude || !longitude) {
            return res.status(400).json({
                error: 'SOS event ID and location are required'
            });
        }

        const sosCheck = await pool.query(
            `SELECT id FROM sos_events
            WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
            [sos_event_id, userId]
        );

        if (sosCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Active SOS event not found'
            });
        }

        const result = await pool.query(
            `INSERT INTO heartbeat_logs
            (sos_event_id, user_id, location)
            VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
            RETURNING id, recorded_at`,
            [sos_event_id, userId, longitude, latitude]
        );

        res.status(201).json({
            message: 'Heartbeat logged',
            heartbeat: result.rows[0]
        });

    } catch (error) {
        console.error('heartbeat error:', error.message);
        res.status(500).json({ error: 'Internal server error'});
    }
};

module.exports = { triggerSOS, getActiveSOSEvents, resolveSOSEvent, logHeartbeat };