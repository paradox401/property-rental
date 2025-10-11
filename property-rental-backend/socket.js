import { Server } from 'socket.io';
import Notification from './models/Notification.js';

let io;
const onlineUsers = new Map();

export const setupSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173', // Update for production
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    // Track online users
    socket.on('addUser', (userId) => {
      onlineUsers.set(userId, socket.id);
    });

    // Real-time messaging
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

// ----------------------
// Notifications Function
// ----------------------
export const sendNotification = async (userId, type, message, link) => {
  if (!io) throw new Error('Socket.io not initialized');

  const notification = await Notification.create({ userId, type, message, link });

  // Send real-time notification if user is online
  const socketId = onlineUsers.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit('newNotification', notification);
  }
};
