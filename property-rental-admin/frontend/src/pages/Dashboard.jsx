import { useEffect, useState } from 'react';
import API from '../api';
import { formatDate } from '../utils';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get('/overview');
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch dashboard');
      }
    };
    load();
  }, []);

  const totals = data?.totals || {};
  const alerts = data?.alerts || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">System health, workload alerts, and recent admin actions.</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Users</div><div className="kpi-value">{totals.users || 0}</div></div>
        <div className="kpi"><div className="kpi-label">Listings</div><div className="kpi-value">{totals.properties || 0}</div></div>
        <div className="kpi"><div className="kpi-label">Bookings</div><div className="kpi-value">{totals.bookings || 0}</div></div>
        <div className="kpi"><div className="kpi-label">Revenue</div><div className="kpi-value">Rs. {totals.revenue || 0}</div></div>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h3>Alerts</h3>
        <div className="kpi-grid" style={{ marginTop: '0.8rem' }}>
          <div className="kpi"><div className="kpi-label">Pending Listings</div><div className="kpi-value">{alerts.pendingListings || 0}</div></div>
          <div className="kpi"><div className="kpi-label">Owner Requests</div><div className="kpi-value">{alerts.pendingOwnerVerifications || 0}</div></div>
          <div className="kpi"><div className="kpi-label">Open Complaints</div><div className="kpi-value">{alerts.openComplaints || 0}</div></div>
          <div className="kpi"><div className="kpi-label">Failed Payments</div><div className="kpi-value">{alerts.failedPayments || 0}</div></div>
        </div>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h3>Recent Activity</h3>
        <div className="table-wrap" style={{ marginTop: '0.7rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentActivity || []).map((item) => (
                <tr key={item._id}>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>{item.action}</td>
                  <td>{item.entityType}</td>
                  <td>{item.entityId}</td>
                </tr>
              ))}
              {(data?.recentActivity || []).length === 0 && (
                <tr><td colSpan="4">No activity yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
