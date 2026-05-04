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
                'INSERT INTO user_settings (user_id) VALUES ($1) RETURNING *',
                [userId]
            );
        }
        res.json({ settings: result.rows[0] });
    } catch (error) {
        console.error('Get settings error:', error.message);
        res.stus(500).json({ error: 'Internal server error' });
    }
};

const updateSettings = async (req,res) => {
    const userId = req.user.userId;
    const { wake_word, wake_word_enabled } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO user_settings (user_id, wake_word, wake_word_enabled) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET wake_word = $2, wake_word_enabled = $3, updated_at = NOW() RETURNING *`,
            [userId, wake_word || 'help protectme', wake_word_enabled !== false]
        );
        res.json({ message: 'Settings updated', settings: result.rows[0] });
    } catch (error) {
        console.error('Update settings error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getSettings, updateSettings };