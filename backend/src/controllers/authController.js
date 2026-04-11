const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { encrypt } = require('../utils/encryption');
const dotenv = require('dotenv');

dotenv.config();

const register = async (req, res) => {
    const { full_name, phone_number, password, nin } = req.body;

    try {
        if (!full_name || !phone_number || !password) {
            return res.status(400).json({
                error: 'Full name, phone number and password are required'
            });
        }

        const existingUser = await pool.query(
            'SELECT id FROM users WHERE phone_number = $1',
            [phone_number]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'An account with this phone number already exists'
            });
        }

        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(password, salt);

        const nin_encrypted = encrypt(nin);

        const result = await pool.query(
            `INSERT INTO users
            (full_name, phone_number, password_hash, nin_encrypted)
            VALUES ($1, $2, $3, $4)
            RETURNING id, full_name, phone_number, is_verified, created_at`,
            [full_name, phone_number, password_hash, nin_encrypted]
        );

        const newUser = result.rows[0];

        const token = jwt.sign(
            { userId: newUser.id, phone: newUser.phone_number },
            process.env.JWT_SECRET,
            {expiresIn: '7d'}
        );

        res.status(201).json({
            message: 'Account created successfully',
            user: newUser,
            token
        });

        } catch (error) {
            console.error('Registration error:', error.message);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    const login = async (req, res) => {
        const { phone_number, password } = req.body;

        try{
            if (!phone_number || !password){
                return res.status(400).json({
                    error: 'Phone number and password are required'
                });
            }

            const result = await pool.query(
                'SELECT * FROM users WHERE phone_number = $1',
                [phone_number]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    error: 'Invalid phone number or password'
                });
            }

            const user = result.rows[0];

            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword){
                return res.status(401).json({
                    error: 'Invalid phone number or password'
                });
            }

            const token = jwt.sign(
                { userId: user.id, phone: user.phone_number },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                message: 'Login successful',
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    phone_number: user.phone_number,
                    is_verified: user.is_verified
                },
                token
            });

        }catch (error) {
            console.error('Login error:', error.message);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    module.exports = { register, login };