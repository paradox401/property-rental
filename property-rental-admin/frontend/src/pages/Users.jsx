import { useEffect, useState } from 'react';
import API from '../api';
import Pagination from '../components/Pagination';
import { formatDate, parsePaged, statusClass } from '../utils';

export default function Users() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const load = async (nextPage = page) => {
    setLoading(true);
    try {
      const res = await API.get('/users', { params: { q: q || undefined, role: role || undefined, page: nextPage, limit: 20 } });
      const parsed = parsePaged(res.data);
      setRows(parsed.items);
      setMeta(parsed.meta);
      setPage(parsed.meta.page);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (user) => {
    await API.patch(`/users/${user._id}/status`, { isActive: !user.isActive });
    load();
  };

  return (
    <div>
      <div className="page-header"><div><h1>Users</h1><p className="page-subtitle">Search, filter, and activate/suspend accounts.</p></div></div>
      <div className="toolbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/email/citizenship" />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="owner">Owner</option>
          <option value="renter">Renter</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn" onClick={() => load(1)}>{loading ? 'Loading...' : 'Apply'}</button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Owner Verify</th><th>Joined</th><th>Action</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u._id}>
                <td>{u.name || '-'}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td><span className={`badge ${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td><span className={`badge ${statusClass(u.ownerVerificationStatus || 'unverified')}`}>{u.ownerVerificationStatus || 'unverified'}</span></td>
                <td>{formatDate(u.createdAt)}</td>
                <td><button className="btn secondary" onClick={() => toggleActive(u)}>{u.isActive ? 'Suspend' : 'Activate'}</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="7">No users found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} onPageChange={load} />
    </div>
  );
}
