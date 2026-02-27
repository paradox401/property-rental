import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { useSocket } from '../../../context/SocketContext';
import './ChatWindow.css';

export default function ChatWindow({ selectedUser }) {
  const { user, token } = useContext(AuthContext);
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef(null);

  const fetchMessages = async () => {
    if (!selectedUser || !token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/messages/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data);

      await axios.patch(
        `${API_BASE_URL}/api/messages/read/${selectedUser._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      socket?.current?.emit('messageRead', { to: selectedUser._id });
    } catch (error) {
      console.error('Failed to fetch messages:', error.message);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, [selectedUser, token]);

  useEffect(() => {
    const currentSocket = socket?.current;
    if (!currentSocket) return;

    const handleReceive = (payload) => {
      if (payload.sender === selectedUser?._id) {
        setMessages((prev) => [...prev, { sender: payload.sender, content: payload.text }]);
      }
    };

    const handleTyping = ({ from }) => {
      if (from === selectedUser?._id) setIsTyping(true);
    };

    const handleStopTyping = ({ from }) => {
      if (from === selectedUser?._id) setIsTyping(false);
    };

    const handleRead = ({ from }) => {
      if (from === selectedUser?._id) {
        setMessages((prev) =>
          prev.map((m) => (m.sender === user._id ? { ...m, read: true } : m))
        );
      }
    };

    currentSocket.on('receiveMessage', handleReceive);
    currentSocket.on('typing', handleTyping);
    currentSocket.on('stopTyping', handleStopTyping);
    currentSocket.on('messageRead', handleRead);

    return () => {
      currentSocket.off('receiveMessage', handleReceive);
      currentSocket.off('typing', handleTyping);
      currentSocket.off('stopTyping', handleStopTyping);
      currentSocket.off('messageRead', handleRead);
    };
  }, [socket, selectedUser, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !token) return;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/messages`,
        { recipientId: selectedUser._id, content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) => [...prev, res.data]);
      socket?.current?.emit('sendMessage', {
        receiver: selectedUser._id,
        text: newMessage,
      });
      setNewMessage('');
      socket?.current?.emit('stopTyping', { to: selectedUser._id });
    } catch (error) {
      console.error('Failed to send message:', error.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTypingChange = (value) => {
    setNewMessage(value);
    if (socket?.current && selectedUser) {
      socket.current.emit('typing', { to: selectedUser._id });
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socket.current.emit('stopTyping', { to: selectedUser._id });
      }, 800);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  const lastSent = [...messages].reverse().find((m) => m.sender === user._id);
  const selectedUserLabel = selectedUser?.name || selectedUser?.email || 'User';

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h4>Chat with {selectedUserLabel}</h4>
        {isTyping && <span className="chat-typing-indicator">Typing...</span>}
      </div>
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div
            key={msg._id || idx}
            className={`chat-message ${msg.sender === user._id ? 'sent' : 'received'}`}
          >
            {msg.content}
          </div>
        ))}
        {lastSent?.read && <span className="chat-seen-indicator">Seen</span>}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => handleTypingChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          rows={2}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
