const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/database');

const { startHeartbeatReaper } = require('./controllers/wardController');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = socketio(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
const socketUtil = require('./utils/socket');
socketUtil.init(io);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[NETWORK INTERCEPT] ${req.method} ${req.originalUrl}`);
    next();
});

const authRoutes = require('./routes/authRoutes');
const { authenticate } = require('./middleware/authMiddleware');

app.use('/api/auth', authRoutes);

const sosRoutes = require('./routes/sosRoutes');
app.use('/api/sos', sosRoutes);

const contactsRoutes = require('./routes/contactsRoutes');
app.use('/api/contacts', contactsRoutes);

const geofenceRoutes = require('./routes/geofenceRoutes');
app.use('/api/geofences', geofenceRoutes);

const settingsRoutes = require('./routes/settingsRoutes');
app.use('/api/settings', settingsRoutes);
 
app.get('/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() as time');
        res.json({
            status: 'ProtectMe+ server is alive',
            database: 'connected',
            time: result.rows[0].time
        });
    } catch (error) {
        res.status(500).json({ status: 'server alive', database: 'disconnected', error: error.message });
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`ProtectMe+ server running on port ${PORT}`);
     
    startHeartbeatReaper(); 
});