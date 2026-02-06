import { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import ChatList from '../../components/common/chat/ChatList';
import ChatWindow from '../../components/common/chat/ChatWindow';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import './Messages.css';

export default function Message() {
  const { token } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchAllowedUsers = async () => {
      if (!token) return;

      try {
        const res = await axios.get(`${API_BASE_URL}/api/chat/allowed-users`, {
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
      <ChatList users={users} onSelectUser={setSelectedUser} selectedUser={selectedUser} />
      {selectedUser && <ChatWindow selectedUser={selectedUser} />}
    </div>
  );
}
