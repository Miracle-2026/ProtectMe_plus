const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        
        next();

    } catch (error) {
        return res.status(401).json({
            error: 'Access denied. Invalid or expired token.',
            expired: error.name === 'TokenExpiredError'
        });
    }
};

module.exports = { authenticate };