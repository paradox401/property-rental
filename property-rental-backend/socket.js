import { Server } from 'socket.io';

export const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173', // Change to production frontend URL
      methods: ['GET', 'POST'],
    },
  });

  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    socket.on('addUser', (userId) => {
      onlineUsers.set(userId, socket.id);
    });

    socket.on('sendMessage', ({ sender, receiver, text }) => {
      const receiverSocket = onlineUsers.get(receiver);
      if (receiverSocket) {
        io.to(receiverSocket).emit('receiveMessage', { sender, text });
      }
    });

    socket.on('disconnect', () => {
      for (let [userId, socketId] of onlineUsers) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
    });
  });
};
