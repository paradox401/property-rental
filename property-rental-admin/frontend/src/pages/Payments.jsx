import { useEffect, useState } from 'react';
import API from '../api';
import Pagination from '../components/Pagination';
import { formatDate, parsePaged, statusClass } from '../utils';

export default function Payments() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const load = async (nextPage = 1) => {
    const res = await API.get('/payments', { params: { status: status || undefined, page: nextPage, limit: 20 } });
    const parsed = parsePaged(res.data);
    setRows(parsed.items);
    setMeta(parsed.meta);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, nextStatus) => {
    await API.patch(`/payments/${id}/status`, { status: nextStatus });
    load(meta.page);
  };

  return (
    <div>
      <div className="page-header"><div><h1>Payments</h1><p className="page-subtitle">Monitor transactions, failures, and refunds.</p></div></div>
      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
          <option value="Failed">Failed</option>
          <option value="Refunded">Refunded</option>
        </select>
        <button className="btn" onClick={() => load(1)}>Apply</button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>PID</th><th>Renter</th><th>Booking</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p._id}>
                <td>{p.pid || '-'}</td>
                <td>{p.renter?.email || '-'}</td>
                <td>{p.booking?.property?.title || '-'}</td>
                <td>Rs. {p.amount}</td>
                <td>{p.paymentMethod || '-'}</td>
                <td><span className={`badge ${statusClass(p.status)}`}>{p.status}</span></td>
                <td>{formatDate(p.createdAt)}</td>
                <td>
                  <button className="btn" onClick={() => updateStatus(p._id, 'Paid')}>Paid</button>{' '}
                  <button className="btn warn" onClick={() => updateStatus(p._id, 'Pending')}>Pending</button>{' '}
                  <button className="btn danger" onClick={() => updateStatus(p._id, 'Failed')}>Failed</button>{' '}
                  <button className="btn secondary" onClick={() => updateStatus(p._id, 'Refunded')}>Refunded</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="8">No payments found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} onPageChange={load} />
    </div>
  );
}
