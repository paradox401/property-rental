import React, { useEffect } from 'react';
import './ChatList.css';

export default function ChatList({ users, onSelectUser, fetchUsers }) {
  useEffect(() => {
    const interval = setInterval(() => {
      if (fetchUsers) fetchUsers(); // call parent-provided fetch function
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
          <div key={u._id || u.email} onClick={() => onSelectUser(u)}>
            {u.name || u.email}
          </div>
        ))
      )}
    </div>
  );
}
