const pool = require('../config/database');

const MAX_CONTACTS = 5;

const addContact = async (req, res) => {
    const { contact_name, contact_phone, relationship, is_primary } = req.body;
    const userId = req.user.userId;

    try {
        if (!contact_name || !contact_phone) {
            return res.status(400).json({
                error: 'Contact name and phone number are required'
            });
        }

        const countResult = await pool.query(
            'SELECT COUNT(*) FROM emergency_contacts WHERE user_id = $1',
            [userId]
        );
        
        const currentCount = parseInt(countResult.rows[0].count, 10);

        if (currentCount >= MAX_CONTACTS) {
            return res.status(403).json({
                error: `You cannot add more than ${MAX_CONTACTS} emergency contacts.`
            });
        }

        let makePrimary = is_primary;
        if (currentCount === 0) {
            makePrimary = true;
        }

        if (makePrimary === true) {
            await pool.query(
                `UPDATE emergency_contacts SET is_primary = FALSE WHERE user_id = $1`,
                [userId]
            );
        }

        const result = await pool.query(
            `INSERT INTO emergency_contacts
            (user_id, contact_name, contact_phone, relationship, is_primary, is_blocked)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [userId, contact_name, contact_phone, relationship, makePrimary || false, false]
        );

        res.status(201).json({
            message: 'Emergency contact added',
            contact: result.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'This phone number is already in your emergency contacts'
            });
        }
        console.error('Add contact error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getContacts = async (req, res) => {
    const userId = req.user.userId;

    try {
        const result = await pool.query(
            `SELECT * FROM emergency_contacts
            WHERE user_id = $1
            ORDER BY is_primary DESC, created_at ASC`,
            [userId]
        );

        res.json({ contacts: result.rows });

    } catch (error) {
        console.error('Get contacts error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const toggleBlockContact = async (req, res) => {
    const { id } = req.params;
    const { is_blocked } = req.body;
    const userId = req.user.userId;

    try {
        const result = await pool.query(
            `UPDATE emergency_contacts 
             SET is_blocked = $1 
             WHERE id = $2 AND user_id = $3 
             RETURNING *`,
            [is_blocked, id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        res.json({ message: 'Contact privacy settings updated', contact: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteContact = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const result = await pool.query(
            `DELETE FROM emergency_contacts
            WHERE id = $1 AND user_id = $2
            RETURNING id`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Contact not found or not authorized'
            });
        }

        res.json({ message: 'Contact deleted successfully' });

    } catch (error) {
        console.error('Delete contact error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { addContact, getContacts, deleteContact, toggleBlockContact };