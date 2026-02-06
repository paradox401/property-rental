import React, { useContext, useState } from 'react';
import { NotificationContext } from '../context/NotificationContext';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import './NotificationList.css';

export default function NotificationList() {
  const { notifications, setNotifications, unreadCount } =
    useContext(NotificationContext);
  const { token } = useContext(AuthContext);
  const [open, setOpen] = useState(false);

  const markAsRead = async (id) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
      } else {
        console.error('Failed to mark notification as read');
      }
    } catch (err) {
      console.error('Error marking as read:', err.message);
    }
  };

  return (
    <div className="notification-dropdown">
      <button onClick={() => setOpen(!open)}>
        🔔 {unreadCount > 0 && <span>({unreadCount})</span>}
      </button>
      {open && (
        <div className="notification-list">
          {notifications.length === 0 ? (
            <p>No notifications</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`notification ${n.read ? 'read' : 'unread'}`}
                onClick={() => markAsRead(n._id)}
              >
                <p>{n.message}</p>
                {n.link && (
                  <a href={n.link} target="_blank" rel="noopener noreferrer">
                    View
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
