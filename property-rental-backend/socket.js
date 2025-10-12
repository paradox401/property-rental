import { Server } from 'socket.io';
import Notification from './models/Notification.js';

let io;
const onlineUsers = new Map();

export const setupSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ Socket connected:', socket.id);

    socket.on('addUser', (userId) => {
      if (!userId) return;
      onlineUsers.set(userId.toString(), socket.id);
      console.log('👤 User online:', userId);
    });

    socket.on('sendMessage', ({ sender, receiver, text }) => {
      const receiverSocket = onlineUsers.get(receiver?.toString());
      if (receiverSocket) {
        io.to(receiverSocket).emit('receiveMessage', { sender, text });
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          console.log('❌ User disconnected:', userId);
          break;
        }
      }
    });
  });
};

export const sendNotification = async (userId, type, message, link = '') => {
  if (!io) throw new Error('Socket.io not initialized');

  try {
    const notification = await Notification.create({
      userId,
      type,
      message,
      link,
      createdAt: new Date(),
    });

    const socketId = onlineUsers.get(userId?.toString());
    if (socketId) {
      io.to(socketId).emit('newNotification', {
        _id: notification._id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
        read: notification.read,
      });
    }

    console.log(`📢 Notification sent to ${userId}`);
  } catch (err) {
    console.error('❌ Error sending notification:', err.message);
  }
};
