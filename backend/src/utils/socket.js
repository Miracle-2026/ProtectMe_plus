let io;

const init = (socketInstance) => {
    io = socketInstance;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized. Emergency alerts cannot be broadcasted.');
    }
    return io;
};

module.exports = { init, getIO };