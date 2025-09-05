import React, { useEffect, useState } from 'react';
import API from '../api';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState({
    users: 0,
    properties: 0,
    bookings: 0,
    complaints: 0
  });
  const [complaints, setComplaints] = useState([]);
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const users = await API.get('/users', { headers: { Authorization: `Bearer ${token}` } });
        const properties = await API.get('/properties', { headers: { Authorization: `Bearer ${token}` } });
        const bookings = await API.get('/bookings', { headers: { Authorization: `Bearer ${token}` } });
        const complaintsRes = await API.get('/complaints', { headers: { Authorization: `Bearer ${token}` } });

        setStats({
          users: users.data.length,
          properties: properties.data.length,
          bookings: bookings.data.length,
          complaints: complaintsRes.data.length
        });
        setComplaints(complaintsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [token]);

  const handleResolve = async (id) => {
    try {
      const res = await API.patch(`/complaints/${id}/resolve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setComplaints(prev => prev.map(c => c._id === id ? res.data : c));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-container">
      <h1>Admin Dashboard</h1>

      <div className="cards">
        <div className="card users">
          <h2>{stats.users}</h2>
          <p>Total Users</p>
        </div>
        <div className="card properties">
          <h2>{stats.properties}</h2>
          <p>Total Properties</p>
        </div>
        <div className="card bookings">
          <h2>{stats.bookings}</h2>
          <p>Total Bookings</p>
        </div>
        <div className="card complaints">
          <h2>{stats.complaints}</h2>
          <p>Total Complaints</p>
        </div>
      </div>

      <h2>Complaints</h2>
      <table className="complaints-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Subject</th>
            <th>Message</th>
            <th>Resolved</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map(c => (
            <tr key={c._id} className={c.resolved ? 'resolved' : ''}>
              <td>{c.name}</td>
              <td>{c.subject}</td>
              <td>{c.complaint}</td>
              <td>{c.resolved ? 'Yes' : 'No'}</td>
              <td>
                {!c.resolved && <button className="resolve-btn" onClick={() => handleResolve(c._id)}>Mark Resolved</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
