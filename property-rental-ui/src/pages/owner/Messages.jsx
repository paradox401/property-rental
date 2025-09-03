import { useState, useEffect } from 'react';
import axios from 'axios';
import ChatList from '../../components/common/chat/ChatList';
import ChatWindow from '../../components/common/chat/ChatWindow';
import './Messages.css';

export default function Message() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchAllowedUsers = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/chat/allowed-users', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUsers(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error('Error fetching allowed users:', error.message);
      }
    };

    fetchAllowedUsers();
  }, [token]);

  return (
    <div className="message-page">
      <ChatList
        users={users}
        onSelectUser={setSelectedUser}
        selectedUser={selectedUser}
      />
      {selectedUser && <ChatWindow selectedUser={selectedUser} />}
    </div>
  );
}
