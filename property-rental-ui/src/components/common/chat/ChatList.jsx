import React, { useEffect } from 'react';
import './ChatList.css';

export default function ChatList({ users, onSelectUser, fetchUsers, selectedUser }) {
  useEffect(() => {
    if (!fetchUsers) return;

    const interval = setInterval(() => {
      fetchUsers();
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  return (
    <div className="chat-sidebar">
      <h1>Users</h1>
      {users.length === 0 ? (
        <p>No users available</p>
      ) : (
        users.map((u) => (
          <div
            key={u._id || u.email}
            className={selectedUser?._id === u._id ? 'active' : ''}
            onClick={() => onSelectUser(u)}
          >
            {u.name || u.email}
          </div>
        ))
      )}
    </div>
  );
}
