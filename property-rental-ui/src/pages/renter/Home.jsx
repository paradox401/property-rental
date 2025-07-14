import React, { useEffect, useState, useContext } from 'react';
import './Home.css';
import { AuthContext } from '../../context/AuthContext';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

const COLORS = ['#2a9d8f', '#e9c46a', '#e76f51'];

export default function RenterDashboard() {
  const { token } = useContext(AuthContext);
  const [stats, setStats] = useState({
    bookings: 0,
    favorites: 0,
    bookingStatusCount: { Approved: 0, Pending: 0, Rejected: 0 },
    bookingStats: [],
    recent: [],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/dashboard/renter', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Dashboard load error', err);
      }
    };
    fetchStats();
  }, [token]);

  const statusData = [
    { name: 'Approved', value: stats.bookingStatusCount?.Approved || 0 },
    { name: 'Pending', value: stats.bookingStatusCount?.Pending || 0 },
    { name: 'Rejected', value: stats.bookingStatusCount?.Rejected || 0 },
  ];

  return (
    <div className="dashboard-container">
      <h2>Renter Dashboard</h2>

      <div className="dashboard-cards">
        <div className="card"><h3>{stats.bookings ?? 0}</h3><p>Total Bookings</p></div>
        <div className="card"><h3>{stats.favorites ?? 0}</h3><p>Favorites</p></div>
      </div>

      <div className="chart-section">
        <div className="chart-card">
          <h3>Booking Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Bookings Per Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.bookingStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#2a9d8f" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="recent-properties">
        <h3>Recent Bookings</h3>
        <ul>
          {stats.recent?.map((b) => (
            <li key={b._id}>
              {b.property?.title || 'Unknown Property'} - Rs. {b.property?.price || 'N/A'} - {b.status}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
