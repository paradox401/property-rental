import { useEffect, useState } from 'react';
import API from '../api';
import Pagination from '../components/Pagination';
import { formatDate, parsePaged, statusClass } from '../utils';

export default function Bookings() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const load = async (nextPage = 1) => {
    const res = await API.get('/bookings', { params: { status: status || undefined, page: nextPage, limit: 20 } });
    const parsed = parsePaged(res.data);
    setRows(parsed.items);
    setMeta(parsed.meta);
  };

  useEffect(() => { load(); }, []);

  const setBookingStatus = async (id, nextStatus) => {
    await API.patch(`/bookings/${id}/status`, { status: nextStatus });
    load(meta.page);
  };

  return (
    <div>
      <div className="page-header"><div><h1>Bookings</h1><p className="page-subtitle">Track booking lifecycle and intervene in disputes.</p></div></div>
      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <button className="btn" onClick={() => load(1)}>Apply</button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Property</th><th>Renter</th><th>From</th><th>To</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b._id}>
                <td>{b.property?.title || '-'}</td>
                <td>{b.renter?.name || '-'}</td>
                <td>{formatDate(b.fromDate)}</td>
                <td>{formatDate(b.toDate)}</td>
                <td><span className={`badge ${statusClass(b.status)}`}>{b.status}</span></td>
                <td>
                  <button className="btn" onClick={() => setBookingStatus(b._id, 'Approved')}>Approve</button>{' '}
                  <button className="btn danger" onClick={() => setBookingStatus(b._id, 'Rejected')}>Reject</button>{' '}
                  <button className="btn warn" onClick={() => setBookingStatus(b._id, 'Pending')}>Pending</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="6">No bookings found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} onPageChange={load} />
    </div>
  );
}
