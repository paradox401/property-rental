import { useEffect, useMemo, useState } from 'react';
import API from '../api';

const ROLES = [
  'super_admin',
  'ops_admin',
  'finance_admin',
  'support_admin',
  'readonly_admin',
];

export default function AccessControl() {
  const [admins, setAdmins] = useState([]);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      setError('');
      const res = await API.get('/admins/permissions');
      const list = Array.isArray(res.data?.admins) ? res.data.admins : [];
      setAdmins(
        list.map((item) => ({
          ...item,
          permissionsText: Array.isArray(item.permissions) ? item.permissions.join(', ') : '',
        }))
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load admin permissions');
      setAdmins([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalActive = useMemo(() => admins.filter((item) => item.isActive).length, [admins]);

  const updateField = (id, field, value) => {
    setAdmins((prev) => prev.map((item) => (item._id === id ? { ...item, [field]: value } : item)));
  };

  const saveAdmin = async (admin) => {
    try {
      setSavingId(admin._id);
      setError('');
      setSuccess('');
      const permissions = String(admin.permissionsText || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      await API.patch(`/admins/${admin._id}/permissions`, {
        role: admin.role,
        isActive: Boolean(admin.isActive),
        permissions,
      });
      setSuccess(`Updated permissions for ${admin.displayName || admin.username}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update admin');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Access Control</h1>
          <p className="page-subtitle">Manage admin roles, custom permissions, and account status.</p>
        </div>
      </div>

      <section className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Admins</div><div className="kpi-value">{admins.length}</div></div>
        <div className="kpi"><div className="kpi-label">Active</div><div className="kpi-value">{totalActive}</div></div>
        <div className="kpi"><div className="kpi-label">Inactive</div><div className="kpi-value">{admins.length - totalActive}</div></div>
        <div className="kpi"><div className="kpi-label">Roles</div><div className="kpi-value">{ROLES.length}</div></div>
      </section>

      {error ? <p className="error" style={{ marginTop: '0.8rem' }}>{error}</p> : null}
      {success ? <p style={{ marginTop: '0.8rem' }}>{success}</p> : null}

      <section className="card" style={{ marginTop: '1rem' }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Admin</th>
                <th>Role</th>
                <th>Active</th>
                <th>Custom Permissions (comma-separated)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin._id}>
                  <td>
                    <strong>{admin.displayName || admin.username}</strong>
                    <div>{admin.username}</div>
                  </td>
                  <td>
                    <select
                      value={admin.role || 'ops_admin'}
                      onChange={(e) => updateField(admin._id, 'role', e.target.value)}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(admin.isActive)}
                      onChange={(e) => updateField(admin._id, 'isActive', e.target.checked)}
                    />
                  </td>
                  <td>
                    <textarea
                      rows={2}
                      value={admin.permissionsText}
                      onChange={(e) => updateField(admin._id, 'permissionsText', e.target.value)}
                      placeholder="workflow:read, rules:read"
                      style={{ width: '100%', minWidth: '240px' }}
                    />
                  </td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => saveAdmin(admin)}
                      disabled={savingId === admin._id}
                    >
                      {savingId === admin._id ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 ? (
                <tr>
                  <td colSpan="5">No admins found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
