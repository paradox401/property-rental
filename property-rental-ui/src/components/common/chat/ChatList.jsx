import React from 'react';
import './ChatList.css'

export default function ChatList({ users, onSelectUser }) {
  return (
    <div className="chat-sidebar">
      <h1>Users</h1>
      {users.map((u) => (
        <div key={u._id} onClick={() => onSelectUser(u)}>
          {u.name}
        </div>
      ))}
    </div>
  );
}
