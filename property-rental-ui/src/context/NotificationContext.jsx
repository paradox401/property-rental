import { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from './SocketContext';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const token = localStorage.getItem('token');

  // Fetch existing notifications from backend
  useEffect(() => {
    if (!user || !token) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // Sort so newest notifications appear first
          setNotifications(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        }
      } catch (err) {
        console.error('❌ Error fetching notifications:', err);
      }
    };

    fetchNotifications();
  }, [user, token]);

  // Listen for real-time notifications from socket
  useEffect(() => {
    if (!socket?.current) return;

    const handleNewNotification = (notification) => {
      console.log('🔔 Real-time notification received:', notification);

      // Prevent duplicates
      setNotifications((prev) => {
        if (prev.some((n) => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
    };

    socket.current.on('newNotification', handleNewNotification);

    return () => {
      socket.current.off('newNotification', handleNewNotification);
    };
  }, [socket]);

  // Helper: count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Helper: mark notification as read
  const markAsRead = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.error('❌ Error marking notification as read:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, setNotifications, unreadCount, markAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
