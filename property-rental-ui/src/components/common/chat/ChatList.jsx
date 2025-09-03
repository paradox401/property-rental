import React from 'react';
import './ChatList.css';

export default function ChatList({ users, onSelectUser }) {
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
