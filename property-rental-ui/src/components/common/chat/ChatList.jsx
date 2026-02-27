import React, { useMemo, useState } from 'react';
import './ChatList.css';

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString();
};

export default function ChatList({
  users,
  onSelectUser,
  selectedUser,
  conversationMap = {},
  onTogglePin,
}) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const label = (user.name || user.email || '').toLowerCase();
      return label.includes(normalizedQuery);
    });
  }, [users, normalizedQuery]);

  const handlePinClick = (event, user) => {
    event.stopPropagation();
    if (!onTogglePin) return;
    onTogglePin(user);
  };

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <h1>Messages</h1>
        <p>Newest conversations first</p>
      </div>

      <div className="chat-search-box">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chat"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <p className="chat-empty-state">No conversations found</p>
      ) : (
        filteredUsers.map((u) => {
          const meta = conversationMap[u._id] || {};
          const preview = meta.lastMessage || 'Start a new conversation';
          const unreadCount = Number(meta.unreadCount || 0);
          const isPinned = Boolean(meta.pinned);

          return (
          <div
            key={u._id || u.email}
            className={`chat-thread-item ${selectedUser?._id === u._id ? 'active' : ''}`}
            onClick={() => onSelectUser(u)}
          >
            <div className="chat-thread-top">
              <span className="chat-thread-name">
                {isPinned ? '📌 ' : ''}{u.name || u.email}
              </span>
              <div className="chat-thread-actions">
                <button
                  type="button"
                  className={`chat-thread-pin ${isPinned ? 'pinned' : ''}`}
                  onClick={(event) => handlePinClick(event, u)}
                  title={isPinned ? 'Unpin chat' : 'Pin chat'}
                >
                  📌
                </button>
                <span className="chat-thread-time">{formatTime(meta.lastMessageAt)}</span>
              </div>
            </div>
            <div className="chat-thread-bottom">
              <p className="chat-thread-preview">{preview}</p>
              {unreadCount > 0 && <span className="chat-thread-unread">{unreadCount}</span>}
            </div>
          </div>
          );
        })
      )}
    </div>
  );
}
