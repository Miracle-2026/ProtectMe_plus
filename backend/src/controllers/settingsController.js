const pool = require('../config/database');

const getSettings = async (req, res) => {
    const userId = req.user.userId;
    try {
        let result = await pool.query(
            'SELECT * FROM user_settings WHERE user_id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            result = await pool.query(
                `INSERT INTO user_settings (user_id, wake_word, map_visibility) 
                 VALUES ($1, 'help protectme', true) RETURNING *`,
                [userId]
            );
        }
        
        res.json({ settings: result.rows[0] });
    } catch (error) {
        console.error('Get settings error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateSettings = async (req, res) => {
    const userId = req.user.userId;
    const { wake_word, wake_word_enabled, map_visibility } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO user_settings (user_id, wake_word, wake_word_enabled, map_visibility) 
             VALUES ($1, COALESCE($2, 'help protectme'), COALESCE($3, true), COALESCE($4, true)) 
             ON CONFLICT (user_id) DO UPDATE SET 
             wake_word = COALESCE($2, user_settings.wake_word), 
             wake_word_enabled = COALESCE($3, user_settings.wake_word_enabled), 
             map_visibility = COALESCE($4, user_settings.map_visibility),
             updated_at = NOW() 
             RETURNING *`,
            [
                userId, 
                wake_word !== undefined ? wake_word : null, 
                wake_word_enabled !== undefined ? wake_word_enabled : null,
                map_visibility !== undefined ? map_visibility : null
            ]
        );
        
        res.json({ message: 'Settings updated', settings: result.rows[0] });
    } catch (error) {
        console.error('Update settings error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getSettings, updateSettings };