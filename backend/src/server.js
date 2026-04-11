const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/database');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
    try{
        const result = await pool.query('SELECT NOW() as time');
        res.json({
            status: 'ProtectMe+ server is alive',
        database: 'connected',
    time: result.rows[0].time
});
    } catch (error) {
        res.status(500).json({
            status:'server alive',
            database: 'disconnected',
            error: error.message
        });
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`ProtectMe+ server running on port ${PORT}`);
});