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
  const [conversationMap, setConversationMap] = useState({});

  useEffect(() => {
    const fetchInbox = async () => {
      if (!token) return;

      try {
        const [usersRes, conversationsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/chat/allowed-users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/api/messages/conversations`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
        const rawConversations = Array.isArray(conversationsRes.data) ? conversationsRes.data : [];
        const nextConversationMap = rawConversations.reduce((acc, item) => {
          if (!item?.user?._id) return acc;
          acc[item.user._id] = item;
          return acc;
        }, {});

        const sortedUsers = [...rawUsers].sort((a, b) => {
          const aTime = nextConversationMap[a._id]?.lastMessageAt
            ? new Date(nextConversationMap[a._id].lastMessageAt).getTime()
            : 0;
          const bTime = nextConversationMap[b._id]?.lastMessageAt
            ? new Date(nextConversationMap[b._id].lastMessageAt).getTime()
            : 0;
          if (aTime !== bTime) return bTime - aTime;
          return (a.name || a.email || '').localeCompare(b.name || b.email || '');
        });

        setConversationMap(nextConversationMap);
        setUsers(sortedUsers);
        setSelectedUser((prev) => {
          if (!sortedUsers.length) return null;
          if (prev && sortedUsers.some((user) => user._id === prev._id)) return prev;
          return sortedUsers[0];
        });
      } catch (error) {
        console.error('Error fetching chat inbox:', error.message);
      }
    };

    fetchInbox();
    const interval = setInterval(fetchInbox, 15000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="message-page">
      <ChatList
        users={users}
        onSelectUser={setSelectedUser}
        selectedUser={selectedUser}
        conversationMap={conversationMap}
      />
      {selectedUser && <ChatWindow selectedUser={selectedUser} />}
    </div>
  );
}
