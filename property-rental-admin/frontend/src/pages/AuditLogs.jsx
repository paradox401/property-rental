import { useEffect, useState } from 'react';
import API from '../api';
import Pagination from '../components/Pagination';
import { formatDate, parsePaged } from '../utils';

export default function AuditLogs() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    q: '',
    action: '',
    entityType: '',
    dateFrom: '',
    dateTo: '',
  });

  const load = async (nextPage = 1) => {
    try {
      setError('');
      const res = await API.get('/audit-logs', {
        params: {
          page: nextPage,
          limit: 50,
          q: filters.q || undefined,
          action: filters.action || undefined,
          entityType: filters.entityType || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        },
      });
      const parsed = parsePaged(res.data);
      setRows(parsed.items);
      setMeta(parsed.meta);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit logs');
      setRows([]);
    }
  };

  useEffect(() => { load(); }, []);

  const exportCsv = async () => {
    const res = await API.get('/audit-logs', {
      params: {
        export: 'csv',
        q: filters.q || undefined,
        action: filters.action || undefined,
        entityType: filters.entityType || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'audit-logs.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header"><div><h1>Audit Logs</h1><p className="page-subtitle">Trace all critical admin changes.</p></div></div>
      <div className="toolbar">
        <input
          type="text"
          placeholder="Search action/entity/id"
          value={filters.q}
          onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
        />
        <input
          type="text"
          placeholder="Action"
          value={filters.action}
          onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
        />
        <input
          type="text"
          placeholder="Entity type"
          value={filters.entityType}
          onChange={(e) => setFilters((prev) => ({ ...prev, entityType: e.target.value }))}
        />
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
        />
        <button className="btn" onClick={() => load(1)}>Apply Filters</button>
        <button className="btn secondary" onClick={exportCsv}>Export CSV</button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map((log) => (
              <tr key={log._id}>
                <td>{formatDate(log.createdAt)}</td>
                <td>{log.adminId?.username || '-'}</td>
                <td>{log.action}</td>
                <td>{log.entityType}</td>
                <td>{log.entityId}</td>
                <td><code>{JSON.stringify(log.details || {})}</code></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="6">No audit logs yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} onPageChange={load} />
    </div>
  );
}
