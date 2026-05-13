import { io } from 'socket.io-client';
import { SERVER_URL } from '../config';

let socket = null;

export const connectSocket = (userId) => {
    if (socket) return socket;

    socket = io(SERVER_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 5000
    });

    socket.on('connect', () => {
        console.log('[SOCKET] Connected to ProtectMe+ Network:', socket.id);
        socket.emit('join', userId);
    });

    socket.on('sos_alert', (data) => {
        console.log('[ALERT] New Emergency Nearby:', data);
    });

    socket.on('geofence_breach', (data) => {
        console.log('[BREACH] Ward has exited a Safe Zone:', data);
    });

    socket.on('disconnect', () => {
        console.log('[SOCKET] Disconnected from network');
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};