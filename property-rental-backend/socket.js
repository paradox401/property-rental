import { Server } from 'socket.io';
import Notification from './models/Notification.js';
import User from './models/User.js';

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

    socket.on('typing', ({ from, to }) => {
      const receiverSocket = onlineUsers.get(to?.toString());
      if (receiverSocket) {
        io.to(receiverSocket).emit('typing', { from });
      }
    });

    socket.on('stopTyping', ({ from, to }) => {
      const receiverSocket = onlineUsers.get(to?.toString());
      if (receiverSocket) {
        io.to(receiverSocket).emit('stopTyping', { from });
      }
    });

    socket.on('messageRead', ({ from, to }) => {
      const receiverSocket = onlineUsers.get(to?.toString());
      if (receiverSocket) {
        io.to(receiverSocket).emit('messageRead', { from });
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
  if (!io) {
    // Keep business flows working even if socket server isn't available.
    console.warn('Socket.io not initialized; storing notification only');
  }

  try {
    const user = await User.findById(userId).select('notificationPreferences');
    const prefs = user?.notificationPreferences;
    const inAppEnabled = prefs?.inApp !== false;
    const typeEnabled = prefs?.types?.[type] !== false;

    if (!inAppEnabled || !typeEnabled) {
      return;
    }

    const notification = await Notification.create({
      userId,
      type,
      message,
      link,
    });

    const socketId = onlineUsers.get(userId?.toString());
    if (io && socketId) {
      io.to(socketId).emit('newNotification', {
        _id: notification._id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        read: notification.read,
        createdAt: notification.createdAt,
      });
      console.log(`📢 Notification sent in real-time to ${userId} (${type})`);
    } else {
      console.log(`🕒 User ${userId} offline, notification saved (${type})`);
    }
  } catch (err) {
    console.error('❌ Error sending notification:', err.message);
  }
};

export const broadcastNotification = async (userIds, type, message, link = '') => {
  for (const id of userIds) {
    await sendNotification(id, type, message, link);
  }
};
