const pool = require('../config/database');
const { getIO } = require('../utils/socket');
const dotenv = require('dotenv');

dotenv.config();

const sendSMSAlert = async (phoneNumber, contactName, threatType, address) => {
    try {
        const message = threatType === 'ARMED'
        ? `PROTECTME+ ALERT: ${contactName}, someone in your network triggered an ARMED SOS near ${address}. OBSERVE ONLY. Contact authorities.`
        : `PROTECTME+ ALERT: ${contactName}, someone in your network needs ASSISTANCE near ${address}. Please respond safely.`;

        await fetch('https://api.ng.termii.com/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: phoneNumber,
                from: 'ProtectMe',
                sms: message,
                type: 'plain',
                api_key: process.env.TERMII_API_KEY,
                channel: 'generic'
            })
        });
        return true;
    } catch (error) {
        return false;
    }
};

const triggerSOS = async (req, res) => {
    const { threat_type, latitude, longitude, address } = req.body;
    const userId = req.user.userId;

    try {
        if (!threat_type || !latitude || !longitude) {
            return res.status(400).json({ error: 'Threat type and location are required' });
        }

        const protocol = threat_type === 'ARMED' ? 'OBSERVATION' : 'INTERVENTION';
        const instruction = protocol === 'OBSERVATION' ? 'Observe Only' : 'Assistance Needed';

        const result = await pool.query(
            `INSERT INTO sos_events (user_id, threat_type, protocol, location, address)
             VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)
             RETURNING id, threat_type, protocol, address, created_at`,
            [userId, threat_type, protocol, longitude, latitude, address]
        );
        const sosEvent = result.rows[0];

        const contactsResult = await pool.query(
            'SELECT contact_name, contact_phone FROM emergency_contacts WHERE user_id = $1 AND is_primary = true LIMIT 1',
            [userId]
        );
        
        if (contactsResult.rows.length > 0) {
            sendSMSAlert(contactsResult.rows[0].contact_phone, contactsResult.rows[0].contact_name, threat_type, address);
        }
        
        const nearbyResponders = await pool.query(
            `SELECT u.id FROM users u 
             WHERE u.id != $1 AND u.is_active = true 
             AND ST_DWithin(u.last_known_location::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, 5000)
             AND u.id NOT IN (SELECT contact_phone FROM emergency_contacts WHERE user_id = $1 AND is_blocked = true)
             LIMIT 20`,
            [userId, longitude, latitude]
        );

        const io = getIO();
        nearbyResponders.rows.forEach((responder) => {
            io.to(responder.id).emit('sos_alert', {
                sosId: sosEvent.id,
                threat_type: sosEvent.threat_type,
                protocol: sosEvent.protocol,
                protocol_instruction: `ALERT: ${instruction}! ${protocol === 'OBSERVATION' ? 'DO NOT approach.' : 'Community help requested.'}`,
                address: sosEvent.address
            });
        });

        res.status(201).json({ message: `SOS triggered. ${protocol} protocol activated.`, sos: sosEvent });

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const logHeartbeat = async (req, res) => {
    const { sos_event_id, latitude, longitude } = req.body;
    const userId = req.user.userId;

    try {
        const result = await pool.query(
            `INSERT INTO heartbeat_logs (sos_event_id, user_id, location)
             VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)) RETURNING recorded_at`,
            [sos_event_id, userId, longitude, latitude]
        );
        res.status(201).json({ message: 'LKL Buffer Updated', heartbeat: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getActiveSOSEvents = async (req, res) => {
    try {
        const query = `
            SELECT 
                id, 
                threat_type, 
                protocol, 
                ST_X(location::geometry) as longitude, 
                ST_Y(location::geometry) as latitude,
                address, 
                created_at 
            FROM sos_events 
            WHERE status = 'ACTIVE'
            ORDER BY created_at DESC
        `;
        
        const { rows } = await pool.query(query);

        res.status(200).json({
            success: true,
            active_sos_events: rows
        });
    } catch (error) {
        console.error('Error fetching active SOS events:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to retrieve active emergency feed.' 
        });
    }
};

const resolveSOSEvent = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const query = `
            UPDATE sos_events 
            SET status = 'RESOLVED', 
                resolved_at = NOW() 
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        
        const { rows } = await pool.query(query, [id, userId]);

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Event not found or you are not authorized to resolve it.' 
            });
        }

        res.status(200).json({
            success: true,
            message: 'Emergency resolved successfully.',
            event: rows[0]
        });
    } catch (error) {
        console.error('Resolution Error:', error.message);
        res.status(500).json({ success: false, error: 'Internal server error during resolution.' });
    }
};

const respondToSOS = async (req, res) => {
    const { sos_event_id, status } = req.body;
    const responderId = req.user.id;

    try {
        const query = `
            INSERT INTO responders (sos_event_id, responder_id, status, responded_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (sos_event_id, responder_id) 
            DO UPDATE SET status = $3, responded_at = NOW()
            RETURNING *
        `;
        
        const { rows } = await pool.query(query, [sos_event_id, responderId, status]);

        if (status === 'ACCEPTED') {
            const io = require('../utils/socket').getIO();
            
            const eventQuery = await pool.query('SELECT user_id FROM sos_events WHERE id = $1', [sos_event_id]);
            const victimId = eventQuery.rows[0].user_id;

            io.to(victimId).emit('sos_response', {
                message: 'A responder is on the way!',
                responder_id: responderId,
                status: 'ACCEPTED'
            });
        }

        res.status(200).json({
            success: true,
            message: `You have successfully ${status.toLowerCase()} the request.`,
            response: rows[0]
        });
    } catch (error) {
        console.error('Response Error:', error.message);
        res.status(500).json({ success: false, error: 'Internal server error while responding.' });
    }
};

module.exports = { triggerSOS, getActiveSOSEvents, resolveSOSEvent, logHeartbeat, respondToSOS, sendSMSAlert };