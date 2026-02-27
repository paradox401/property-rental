import React, { useEffect, useState, useContext } from 'react';
import './Dashboard.css';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

const COLORS = ['#2a9d8f', '#e9c46a', '#e76f51'];

export default function Dashboard() {
  const { token, user, setUser } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalBookings: 0,
    totalFavorites: 0,
    bookingStatusCount: { Approved: 0, Pending: 0, Rejected: 0 },
    recentProperties: [],
    propertyStats: [],
    ownerPaymentRows: [],
  });
  const [requesting, setRequesting] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationIdFiles, setVerificationIdFiles] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/dashboard/owner`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Dashboard load error', err);
      }
    };
    fetchStats();
  }, [token]);

  const requestVerification = async () => {
    if (!token) return;
    if (!verificationIdFiles.length) {
      setVerificationMessage('Please upload at least one valid ID photo before submitting verification request.');
      return;
    }
    setRequesting(true);
    setVerificationMessage('');
    const formData = new FormData();
    verificationIdFiles.forEach((file) => {
      formData.append('idImages', file);
    });
    const res = await fetch(`${API_BASE_URL}/api/users/owner/verify-request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      setUser((prev) => ({ ...prev, ownerVerificationStatus: data.status }));
      setVerificationMessage('Verification request submitted. Please wait for admin approval.');
      setVerificationIdFiles([]);
    } else {
      setVerificationMessage(data.error || 'Failed to submit verification request.');
    }
    setRequesting(false);
  };

  const statusData = [
    { name: 'Approved', value: stats.bookingStatusCount?.Approved || 0 },
    { name: 'Pending', value: stats.bookingStatusCount?.Pending || 0 },
    { name: 'Rejected', value: stats.bookingStatusCount?.Rejected || 0 },
  ];

  return (
    <div className="dashboard-container">
      <h2>Owner Dashboard</h2>

      <div className="dashboard-cards">
        <div className="card">
          <h3>{stats.totalProperties ?? 0}</h3>
          <p>Total Properties</p>
        </div>
        <div className="card">
          <h3>{stats.totalBookings ?? 0}</h3>
          <p>Total Bookings</p>
        </div>
        <div className="card">
          <h3>{stats.totalFavorites ?? 0}</h3>
          <p>Favorites</p>
        </div>
      </div>

      <div className="surface-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3>Owner Verification</h3>
        <p>Status: {user?.ownerVerificationStatus || 'unverified'}</p>
        {user?.ownerVerificationStatus === 'rejected' && user?.ownerVerificationRejectReason && (
          <p style={{ color: '#b91c1c', marginTop: '0.5rem' }}>
            Last rejection reason: {user.ownerVerificationRejectReason}
          </p>
        )}
        {(user?.ownerVerificationStatus === 'unverified' ||
          user?.ownerVerificationStatus === 'rejected') && (
          <>
            <div style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="owner-id-image" style={{ display: 'block', marginBottom: '0.4rem' }}>
                Upload Valid ID Photo(s)
              </label>
              <input
                id="owner-id-image"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setVerificationIdFiles(Array.from(e.target.files || []))}
              />
              {verificationIdFiles.length > 0 && (
                <p style={{ marginTop: '0.4rem' }}>{verificationIdFiles.length} file(s) selected</p>
              )}
            </div>
            <button onClick={requestVerification} disabled={requesting}>
              {requesting ? 'Requesting...' : 'Request Verification'}
            </button>
          </>
        )}
        {user?.ownerVerificationStatus === 'pending' && (
          <p style={{ color: '#92400e', marginTop: '0.5rem' }}>
            Your verification request is pending admin review.
          </p>
        )}
        {verificationMessage && (
          <p style={{ marginTop: '0.5rem' }}>{verificationMessage}</p>
        )}
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
          <h3>Properties Added Per Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.propertyStats || []}>
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
        <h3>Recent Properties</h3>
        {Array.isArray(stats.recentProperties) && stats.recentProperties.length > 0 ? (
          <ul>
            {stats.recentProperties.map((p) => (
              <li key={p._id}>
                {p.title} - Rs. {p.price} - {p.status || 'Available'}
              </li>
            ))}
          </ul>
        ) : (
          <p>No recent properties</p>
        )}
      </div>

      <div className="owner-payment-status">
        <h3>Renter Payment Status</h3>
        {Array.isArray(stats.ownerPaymentRows) && stats.ownerPaymentRows.length > 0 ? (
          <div className="payment-status-table-wrap">
            <table className="payment-status-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Renter</th>
                  <th>Monthly Rent</th>
                  <th>Booking From</th>
                  <th>Status</th>
                  <th>Last Payment</th>
                </tr>
              </thead>
              <tbody>
                {stats.ownerPaymentRows.map((row) => (
                  <tr key={row.bookingId}>
                    <td>{row.propertyTitle}</td>
                    <td>
                      <div>{row.renterName}</div>
                      <small>{row.renterEmail}</small>
                    </td>
                    <td>Rs. {row.monthlyRent}</td>
                    <td>{row.fromDate ? new Date(row.fromDate).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`payment-chip ${row.paymentStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                        {row.paymentStatus}
                      </span>
                    </td>
                    <td>
                      {row.latestPaymentAmount
                        ? `Rs. ${row.latestPaymentAmount} (${new Date(row.latestPaymentAt).toLocaleDateString()})`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No approved bookings with payment records yet.</p>
        )}
      </div>
    </div>
  );
}
