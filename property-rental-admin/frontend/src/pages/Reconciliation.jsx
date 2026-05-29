import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';
import './Reconciliation.css';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

function SummaryGroup({ title, data = {} }) {
  const rows = Object.entries(data);
  return (
    <section className="card reconciliation-summary-card">
      <h3>{title}</h3>
      <div className="reconciliation-status-grid">
        {rows.length ? rows.map(([status, item]) => (
          <div key={status} className="reconciliation-status-item">
            <span>{status.replace(/_/g, ' ')}</span>
            <strong>{item.count || 0}</strong>
            <small>{money(item.amount)}</small>
          </div>
        )) : <p className="page-subtitle">No records yet.</p>}
      </div>
    </section>
  );
}

export default function Reconciliation() {
  const [data, setData] = useState({ totalIssues: 0, high: 0, medium: 0, items: [], summaries: {} });
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/ops/reconciliation');
      setData(res.data || { totalIssues: 0, items: [], summaries: {} });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reconciliation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const issueTypes = useMemo(
    () => Array.from(new Set((data.items || []).map((item) => item.type))).filter(Boolean),
    [data.items]
  );

  const filteredItems = useMemo(
    () => (data.items || []).filter((item) => (
      (!severity || item.severity === severity) &&
      (!type || item.type === type)
    )),
    [data.items, severity, type]
  );

  const pendingFailed = data.summaries?.pendingFailed || {};

  return (
    <div className="reconciliation-page">
      <div className="page-header">
        <div>
          <h1>Payment Reconciliation</h1>
          <p className="page-subtitle">Review visit payments, booking charges, rent payments, failed items, and mismatches.</p>
        </div>
        <button type="button" className="btn" onClick={load} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <section className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Total Issues</div><div className="kpi-value">{data.totalIssues || 0}</div></div>
        <div className="kpi"><div className="kpi-label">High Severity</div><div className="kpi-value">{data.high || 0}</div></div>
        <div className="kpi"><div className="kpi-label">Pending Reviews</div><div className="kpi-value">{(pendingFailed.pendingVisitPayments || 0) + (pendingFailed.pendingBookingCharges || 0) + (pendingFailed.pendingRentPayments || 0)}</div></div>
        <div className="kpi"><div className="kpi-label">Failed / Rejected</div><div className="kpi-value">{(pendingFailed.failedRentPayments || 0) + (pendingFailed.failedBookingCharges || 0) + (pendingFailed.rejectedVisitPayments || 0)}</div></div>
      </section>

      <div className="reconciliation-links">
        <Link to="/visits">Open Visits</Link>
        <Link to="/bookings">Open Bookings</Link>
        <Link to="/payments">Open Rent Payments</Link>
        <Link to="/settings">Edit Charges</Link>
      </div>

      <div className="reconciliation-summary-layout">
        <SummaryGroup title="Visit Payments" data={data.summaries?.visitPayments} />
        <SummaryGroup title="Booking Charges" data={data.summaries?.bookingCharges} />
        <SummaryGroup title="Rent Payments" data={data.summaries?.rentPayments} />
      </div>

      <section className="card">
        <div className="reconciliation-card-header">
          <div>
            <h3>Mismatch Queue</h3>
            <p className="page-subtitle">Items that need admin review or cleanup.</p>
          </div>
          <div className="toolbar reconciliation-filters">
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">All severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All issue types</option>
              {issueTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Booking</th>
                <th>Payment</th>
                <th>Visit / Pass</th>
                <th>Severity</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => (
                <tr key={`${item.type}-${item.bookingId || item.paymentId || item.visitId || item.visitPassId || idx}`}>
                  <td>{item.type}</td>
                  <td>{item.bookingId || '-'}</td>
                  <td>{item.paymentId || '-'}</td>
                  <td>{item.visitId || item.visitPassId || '-'}</td>
                  <td><span className={`badge ${item.severity === 'high' ? 'rejected' : 'pending'}`}>{item.severity}</span></td>
                  <td>{item.message}</td>
                </tr>
              ))}
              {!filteredItems.length && (
                <tr><td colSpan="6">{loading ? 'Loading reconciliation data...' : 'No reconciliation issues for this filter.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
