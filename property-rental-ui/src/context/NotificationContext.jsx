import { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from './SocketContext'; // your existing socket for messaging
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const socket = useSocket(); // reuse messaging socket
  const [notifications, setNotifications] = useState([]);
  const token = localStorage.getItem('token');

  // Fetch existing notifications
  useEffect(() => {
    if (!user || !token) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
  }, [user, token]);

  // Listen for real-time notifications using existing socket
  useEffect(() => {
    if (!socket?.current) return;

    socket.current.on('newNotification', (notification) => {
      console.log('🔔 New notification received:', notification);
      setNotifications((prev) => [notification, ...prev]);
    });

    return () => socket.current.off('newNotification');
  }, [socket]);

  return (
    <NotificationContext.Provider value={{ notifications, setNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
