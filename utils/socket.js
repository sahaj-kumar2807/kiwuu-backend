let io;

const setIO = (socketIO) => {
    io = socketIO;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO not initialized");
    }

    return io;
};

module.exports = {
    setIO,
    getIO
};