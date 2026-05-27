import { Fragment, useEffect, useState } from 'react';
import API from '../api';
import Pagination from '../components/Pagination';
import { formatDate, parsePaged, statusClass } from '../utils';

export default function Users() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [openUserId, setOpenUserId] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const load = async (nextPage = page) => {
    setLoading(true);
    try {
      const res = await API.get('/users', {
        params: {
          q: q || undefined,
          role: role || undefined,
          active: active || undefined,
          page: nextPage,
          limit: 20,
        },
      });
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
    try {
      setActionLoadingId(user._id);
      setError('');
      await API.patch(`/users/${user._id}/status`, { isActive: !user.isActive });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user status');
    } finally {
      setActionLoadingId('');
    }
  };

  const deleteUser = async (user) => {
    const confirmed = window.confirm(
      `Permanently delete ${user.name || user.email}? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      setActionLoadingId(user._id);
      setError('');
      await API.delete(`/users/${user._id}`);
      await load(1);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete user';
      const refs = err.response?.data?.totalRefs;
      if (err.response?.status === 409) {
        const force = window.confirm(
          `${message}\nLinked refs: ${refs || 0}\n\nForce delete will remove user and dependent records. Continue?`
        );
        if (force) {
          try {
            await API.delete(`/users/${user._id}?force=true`);
            await load(1);
            return;
          } catch (forceErr) {
            setError(forceErr.response?.data?.error || 'Force delete failed');
            return;
          }
        }
      }
      setError(refs ? `${message} Linked refs: ${refs}` : message);
    } finally {
      setActionLoadingId('');
    }
  };

  const markEmailVerified = async (user) => {
    try {
      setActionLoadingId(user._id);
      setError('');
      await API.patch(`/users/${user._id}/email-verification`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark email verified');
    } finally {
      setActionLoadingId('');
    }
  };

  return (
    <div>
      <div className="page-header"><div><h1>Users</h1><p className="page-subtitle">Search, filter, and activate/suspend accounts.</p></div></div>
      <section className="ops-summary-grid">
        <article><span>Visible Users</span><strong>{rows.length}</strong></article>
        <article><span>Suspended</span><strong>{rows.filter((u) => !u.isActive).length}</strong></article>
        <article><span>KYC Pending</span><strong>{rows.filter((u) => u.kycStatus === 'pending').length}</strong></article>
        <article><span>Owner Review</span><strong>{rows.filter((u) => u.ownerVerificationStatus === 'pending').length}</strong></article>
      </section>
      <div className="toolbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/email/citizenship" />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="owner">Owner</option>
          <option value="renter">Renter</option>
          <option value="admin">Admin</option>
        </select>
        <select value={active} onChange={(e) => setActive(e.target.value)}>
          <option value="">Any account state</option>
          <option value="true">Active only</option>
          <option value="false">Suspended only</option>
        </select>
        <button className="btn" onClick={() => load(1)}>{loading ? 'Loading...' : 'Apply'}</button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Email Verify</th><th>Owner Verify</th><th>KYC</th><th>Activity</th><th>Joined</th><th>Action</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <Fragment key={u._id}>
                <tr key={u._id}>
                  <td>{u.name || '-'}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td><span className={`badge ${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <span className={`badge ${u.emailVerified === true ? 'verified' : 'unverified'}`}>
                      {u.emailVerified === true ? 'verified' : 'unverified'}
                    </span>
                  </td>
                  <td><span className={`badge ${statusClass(u.ownerVerificationStatus || 'unverified')}`}>{u.ownerVerificationStatus || 'unverified'}</span></td>
                  <td>
                    <span className={`badge ${statusClass(u.kycStatus || 'unsubmitted')}`}>
                      {u.kycStatus || 'unsubmitted'}
                    </span>
                  </td>
                  <td>
                    <div className="compact-stat-list">
                      <span>P {u.adminStats?.properties || 0}</span>
                      <span>B {u.adminStats?.bookings || 0}</span>
                      <span>V {u.adminStats?.visits || 0}</span>
                    </div>
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    <div className="admin-action-row">
                      <button
                        className="btn secondary"
                        onClick={() => toggleActive(u)}
                        disabled={actionLoadingId === u._id}
                      >
                        {actionLoadingId === u._id ? 'Working...' : u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                      {u.emailVerified !== true ? (
                        <button
                          className="btn"
                          onClick={() => markEmailVerified(u)}
                          disabled={actionLoadingId === u._id}
                        >
                          Mark OTP Verified
                        </button>
                      ) : null}
                      <button className="btn secondary" onClick={() => setOpenUserId(openUserId === u._id ? '' : u._id)}>
                        {openUserId === u._id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        className="btn danger"
                        onClick={() => deleteUser(u)}
                        disabled={actionLoadingId === u._id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                {openUserId === u._id ? (
                  <tr key={`${u._id}-details`}>
                    <td colSpan="10">
                      <div className="admin-detail-panel">
                        <dl>
                          <dt>Citizenship</dt><dd>{u.citizenshipNumber || '-'}</dd>
                          <dt>Properties</dt><dd>{u.adminStats?.properties || 0} total, {u.adminStats?.pendingProperties || 0} pending</dd>
                          <dt>Bookings</dt><dd>{u.adminStats?.bookings || 0} total, {u.adminStats?.approvedBookings || 0} approved</dd>
                          <dt>Payments</dt><dd>{u.adminStats?.payments || 0} total, {u.adminStats?.pendingPayments || 0} pending</dd>
                          <dt>Visits</dt><dd>{u.adminStats?.visits || 0} total, {u.adminStats?.pendingBookingFees || 0} pending booking fees</dd>
                          <dt>KYC reason</dt><dd>{u.kycRejectReason || '-'}</dd>
                        </dl>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {rows.length === 0 && <tr><td colSpan="10">No users found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} onPageChange={load} />
    </div>
  );
}
