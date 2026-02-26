import { useEffect, useState } from 'react';
import API from '../api';
import Pagination from '../components/Pagination';
import { formatDate, parsePaged } from '../utils';

export default function AuditLogs() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  const load = async (nextPage = 1) => {
    const res = await API.get('/audit-logs', { params: { page: nextPage, limit: 50 } });
    const parsed = parsePaged(res.data);
    setRows(parsed.items);
    setMeta(parsed.meta);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header"><div><h1>Audit Logs</h1><p className="page-subtitle">Trace all critical admin changes.</p></div></div>
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
