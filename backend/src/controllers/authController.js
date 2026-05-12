const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');
const dotenv = require('dotenv');

dotenv.config();

const generateTokens = (userId, phone) => {
    if (!process.env.JWT_SECRET) throw new Error("FATAL: JWT_SECRET is undefined.");
    
    const token = jwt.sign(
        { userId, phone },
        process.env.JWT_SECRET,
        { expiresIn: '30s' } 
    );

    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const refreshToken = jwt.sign(
        { userId, phone },
        secret,
        { expiresIn: '7d' }
    );

    return { token, refreshToken };
};

const register = async (req, res) => {
    const { full_name, phone_number, password, nin } = req.body;

    try {
        if (!full_name || !phone_number || !password || !nin) {
            return res.status(400).json({ error: 'All fields including NIN are required' });
        }

        if (!/^\d{11}$/.test(nin.toString())) {
            return res.status(400).json({ error: 'NIN must be exactly 11 digits' });
        }

        const existingUser = await pool.query(
            'SELECT id FROM users WHERE phone_number = $1',
            [phone_number]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'An account with this phone number already exists' });
        }

        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(password, salt);
        const nin_encrypted = encrypt(nin.toString());

        const result = await pool.query(
            `INSERT INTO users
            (full_name, phone_number, password_hash, nin_encrypted)
            VALUES ($1, $2, $3, $4)
            RETURNING id, full_name, phone_number, is_verified, created_at`,
            [full_name, phone_number, password_hash, nin_encrypted]
        );

        const newUser = result.rows[0];
        const { token, refreshToken } = generateTokens(newUser.id, newUser.phone_number);

        res.status(201).json({
            message: 'Account created successfully',
            user: newUser,
            token,
            refresh_token: refreshToken
        });

    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const login = async (req, res) => {
    const { phone_number, password } = req.body;

    try {
        if (!phone_number || !password) {
            return res.status(400).json({ error: 'Phone number and password are required' });
        }

        const result = await pool.query(
            'SELECT * FROM users WHERE phone_number = $1',
            [phone_number]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid phone number or password' });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid phone number or password' });
        }

        const { token, refreshToken } = generateTokens(user.id, user.phone_number);

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                full_name: user.full_name,
                phone_number: user.phone_number,
                is_verified: user.is_verified
            },
            token,
            refresh_token: refreshToken
        });

    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const refresh = async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(401).json({ error: 'Refresh token required' });
    }

    try {
        const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
        const decoded = jwt.verify(refresh_token, secret);
        
        const token = jwt.sign(
            { userId: decoded.userId, phone: decoded.phone }, 
            process.env.JWT_SECRET, 
            { expiresIn: '30s' } 
        );

        res.json({ token });
    } catch (error) {
        console.error('Refresh failed:', error.message);
        res.status(403).json({ error: 'Invalid refresh token. User must re-authenticate.' });
    }
};

const verifyNIN = async (req, res) => {
    const { nin } = req.body;
    const userId = req.user.userId;

    try {
        if (!nin || !/^\d{11}$/.test(nin.toString())) {
            return res.status(400).json({ error: 'NIN must be exactly 11 digits' });
        }

        const userRecord = await pool.query(
            'SELECT nin_encrypted FROM users WHERE id = $1',
            [userId]
        );

        if (userRecord.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const storedNin = decrypt(userRecord.rows[0].nin_encrypted);
        
        if (storedNin !== nin.toString()) {
            return res.status(401).json({ error: 'Verification failed: NIN does not match registered profile' });
        }

        await pool.query(
            'UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1',
            [userId]
        );

        const updatedUser = await pool.query(
            'SELECT id, full_name, phone_number, is_verified FROM users WHERE id = $1',
            [userId]
        );

        res.json({
            message: 'Identity verified successfully',
            user: updatedUser.rows[0]
        });

    } catch (error) {
        console.error('Verify NIN error: ', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { register, login, refresh, verifyNIN };