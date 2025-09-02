import { useState, useEffect } from 'react';
import ChatList from '../../components/common/chat/ChatList';
import ChatWindow from '../../components/common/chat/ChatWindow';
import axios from 'axios';
import './Messages.css';

export default function Messages() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);

  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  console.log('User from localStorage:', user);
console.log('Token from localStorage:', token);


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('res.data:', res.data);

        const usersData = Array.isArray(res.data) ? res.data : res.data.users;

        if (!Array.isArray(usersData)) {
          throw new Error('Expected an array of users, but got: ' + JSON.stringify(res.data));
        }

        setUsers(usersData.filter((u) => u._id !== user._id));
      } catch (error) {
        console.error('fetchUsers error:', error.message);
      }
    };

    fetchUsers();
  }, [token, user]);

  return (
    <div className="message-page">
      <ChatList users={users} onSelectUser={setSelectedUser} />
      {selectedUser && <ChatWindow selectedUser={selectedUser} />}
    </div>
  );
}
