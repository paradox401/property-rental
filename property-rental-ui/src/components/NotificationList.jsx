import React, { useContext, useState } from 'react';
import { NotificationContext } from '../context/NotificationContext';
import './NotificationList.css';
export default function NotificationList() {
  const { notifications, setNotifications } = useContext(NotificationContext);
  const [open, setOpen] = useState(false);

  const markAsRead = async (id) => {
    await fetch(`http://localhost:8000/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-dropdown">
      <button onClick={() => setOpen(!open)}>
        🔔 {unreadCount > 0 && <span>({unreadCount})</span>}
      </button>
      {open && (
        <div className="notification-list">
          {notifications.length === 0 && <p>No notifications</p>}
          {notifications.map(n => (
            <div
              key={n._id}
              className={`notification ${n.read ? 'read' : 'unread'}`}
              onClick={() => markAsRead(n._id)}
            >
              <p>{n.message}</p>
              {n.link && <a href={n.link}>View</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
