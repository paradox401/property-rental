import { useState } from 'react';
import API from '../api';

export default function Notifications() {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('announcement');
  const [role, setRole] = useState('');
  const [result, setResult] = useState('');

  const send = async () => {
    const res = await API.post('/broadcast', { message, type, role: role || undefined });
    setResult(`${res.data.recipients} users notified`);
    setMessage('');
  };

  return (
    <div>
      <div className="page-header"><div><h1>Notifications</h1><p className="page-subtitle">Send announcements to all users or selected roles.</p></div></div>
      <div className="card">
        <div className="toolbar">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="announcement">Announcement</option>
            <option value="policy">Policy</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="owner">Owners</option>
            <option value="renter">Renters</option>
          </select>
        </div>
        <textarea
          rows="5"
          style={{ width: '100%', marginBottom: '0.7rem' }}
          placeholder="Broadcast message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className="btn" onClick={send} disabled={!message.trim()}>Send Broadcast</button>
        {result && <p style={{ marginTop: '0.6rem' }}>{result}</p>}
      </div>
    </div>
  );
}
