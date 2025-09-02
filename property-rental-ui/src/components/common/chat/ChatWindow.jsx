import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../../context/AuthContext';
import './ChatWindow.css';

export default function ChatWindow({ selectedUser }) {
  const { user } = useContext(AuthContext);
  const token = localStorage.getItem('token');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/messages/${selectedUser._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(res.data);
      } catch (error) {
        console.error('Failed to fetch messages:', error.message);
      }
    };

    if (selectedUser) {
      fetchMessages();
    }
  }, [selectedUser]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      const res = await axios.post(
        `http://localhost:8000/api/messages`,
        {
          recipientId: selectedUser._id,
          content: newMessage,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessages((prev) => [...prev, res.data]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error.message);
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h4>Chat with {selectedUser.email}</h4>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`chat-message ${msg.sender === user._id ? 'sent' : 'received'}`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message"
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
