import { io } from 'socket.io-client';
import { SERVER_URL } from '../config';

let socket = null;

export const connectSocket = (userId) => {
    if (socket) return socket;

    socket = io(SERVER_URL, {
        transports: ['websocket'],
        autoConnect: true
    });

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        socket.emit('join', userId);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
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