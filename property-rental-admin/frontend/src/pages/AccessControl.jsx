import { useEffect, useMemo, useState } from 'react';
import API from '../api';

const ROLES = ['super_admin', 'ops_admin', 'finance_admin', 'support_admin', 'readonly_admin'];

const decodeAdminId = () => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) return '';
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!base64) return '';
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    return payload?.id || '';
  } catch {
    return '';
  }
};

const sortByLabel = (items = []) =>
  [...items].sort((a, b) => String(a).localeCompare(String(b)));

export default function AccessControl() {
  const [admins, setAdmins] = useState([]);
  const [baselineById, setBaselineById] = useState({});
  const [rolePermissionMap, setRolePermissionMap] = useState({});
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({
    q: '',
    role: '',
    active: '',
  });
  const [creating, setCreating] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'ops_admin',
    permissionsText: '',
    isActive: true,
  });

  const currentAdminId = useMemo(() => decodeAdminId(), []);

  const load = async () => {
    try {
      setError('');
      const res = await API.get('/admins/permissions');
      const list = Array.isArray(res.data?.admins) ? res.data.admins : [];
      const mapped = list.map((item) => {
        const customPermissions = Array.isArray(item.permissions) ? item.permissions : [];
        return {
          ...item,
          customPermissions,
          permissionsText: customPermissions.join(', '),
        };
      });
      setAdmins(mapped);
      setBaselineById(
        mapped.reduce((acc, item) => {
          acc[item._id] = {
            role: item.role,
            isActive: Boolean(item.isActive),
            customPermissions: [...item.customPermissions],
          };
          return acc;
        }, {})
      );
      setRolePermissionMap(res.data?.rolePermissionMap || {});
      setPermissionCatalog(sortByLabel(res.data?.permissionCatalog || []));
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Only super admin can manage Access Control.');
      } else {
        setError(err.response?.data?.error || 'Failed to load admin permissions');
      }
      setAdmins([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalActive = useMemo(() => admins.filter((item) => item.isActive).length, [admins]);

  const filteredAdmins = useMemo(() => {
    const q = String(filters.q || '').trim().toLowerCase();
    return admins.filter((item) => {
      if (filters.role && item.role !== filters.role) return false;
      if (filters.active === 'active' && !item.isActive) return false;
      if (filters.active === 'inactive' && item.isActive) return false;
      if (!q) return true;
      const haystack = [
        item.displayName || '',
        item.username || '',
        item.role || '',
        ...(Array.isArray(item.customPermissions) ? item.customPermissions : []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [admins, filters]);

  const updateField = (id, field, value) => {
    setAdmins((prev) => prev.map((item) => (item._id === id ? { ...item, [field]: value } : item)));
  };

  const normalizePermissions = (values) =>
    sortByLabel(Array.from(new Set((values || []).map((item) => String(item).trim()).filter(Boolean))));

  const setCustomPermissions = (id, permissions) => {
    const normalized = normalizePermissions(permissions);
    setAdmins((prev) =>
      prev.map((item) =>
        item._id === id
          ? {
              ...item,
              customPermissions: normalized,
              permissionsText: normalized.join(', '),
            }
          : item
      )
    );
  };

  const togglePermission = (adminId, permission) => {
    const target = admins.find((item) => item._id === adminId);
    if (!target) return;
    const next = target.customPermissions.includes(permission)
      ? target.customPermissions.filter((item) => item !== permission)
      : [...target.customPermissions, permission];
    setCustomPermissions(adminId, next);
  };

  const parsePermissionText = (text) =>
    normalizePermissions(String(text || '').split(',').map((item) => item.trim()));

  const createAdmin = async () => {
    try {
      setCreating(true);
      setError('');
      setSuccess('');
      await API.post('/admins', {
        username: newAdmin.username.trim(),
        password: newAdmin.password,
        displayName: newAdmin.displayName.trim(),
        role: newAdmin.role,
        permissions: parsePermissionText(newAdmin.permissionsText),
        isActive: Boolean(newAdmin.isActive),
      });
      setSuccess(`Created admin ${newAdmin.username.trim()}`);
      setNewAdmin({
        username: '',
        password: '',
        displayName: '',
        role: 'ops_admin',
        permissionsText: '',
        isActive: true,
      });
      await load();
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Only super admin can create admin accounts.');
      } else {
        setError(err.response?.data?.error || 'Failed to create admin');
      }
    } finally {
      setCreating(false);
    }
  };

  const getRoleDefaults = (role) => sortByLabel(rolePermissionMap?.[role] || []);

  const getEffectivePermissions = (admin) =>
    normalizePermissions([...(getRoleDefaults(admin.role) || []), ...(admin.customPermissions || [])]);

  const isDirty = (admin) => {
    const baseline = baselineById[admin._id];
    if (!baseline) return true;
    const sameRole = baseline.role === admin.role;
    const sameActive = Boolean(baseline.isActive) === Boolean(admin.isActive);
    const sameCustom =
      JSON.stringify(normalizePermissions(baseline.customPermissions)) ===
      JSON.stringify(normalizePermissions(admin.customPermissions));
    return !(sameRole && sameActive && sameCustom);
  };

  const resetAdmin = (adminId) => {
    const baseline = baselineById[adminId];
    if (!baseline) return;
    setAdmins((prev) =>
      prev.map((item) =>
        item._id === adminId
          ? {
              ...item,
              role: baseline.role,
              isActive: baseline.isActive,
              customPermissions: [...baseline.customPermissions],
              permissionsText: baseline.customPermissions.join(', '),
            }
          : item
      )
    );
  };

  const saveAdmin = async (admin) => {
    try {
      setSavingId(admin._id);
      setError('');
      setSuccess('');
      const permissions = normalizePermissions(admin.customPermissions);
      await API.patch(`/admins/${admin._id}/permissions`, {
        role: admin.role,
        isActive: Boolean(admin.isActive),
        permissions,
      });
      setSuccess(`Updated access for ${admin.displayName || admin.username}`);
      await load();
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Only super admin can update admin access.');
      } else {
        setError(err.response?.data?.error || 'Failed to update admin');
      }
    } finally {
      setSavingId('');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Access Control</h1>
          <p className="page-subtitle">Search, filter, and manage role defaults + custom permissions safely.</p>
        </div>
      </div>

      <section className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Admins</div><div className="kpi-value">{admins.length}</div></div>
        <div className="kpi"><div className="kpi-label">Active</div><div className="kpi-value">{totalActive}</div></div>
        <div className="kpi"><div className="kpi-label">Inactive</div><div className="kpi-value">{admins.length - totalActive}</div></div>
        <div className="kpi"><div className="kpi-label">Permissions</div><div className="kpi-value">{permissionCatalog.length}</div></div>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '0.8rem' }}>Create New Admin</h3>
        <div className="toolbar">
          <input
            type="text"
            placeholder="Username"
            value={newAdmin.username}
            onChange={(e) => setNewAdmin((prev) => ({ ...prev, username: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Display name"
            value={newAdmin.displayName}
            onChange={(e) => setNewAdmin((prev) => ({ ...prev, displayName: e.target.value }))}
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            value={newAdmin.password}
            onChange={(e) => setNewAdmin((prev) => ({ ...prev, password: e.target.value }))}
          />
          <select
            value={newAdmin.role}
            onChange={(e) => setNewAdmin((prev) => ({ ...prev, role: e.target.value }))}
          >
            {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <input
            type="text"
            placeholder="Custom permissions (comma separated)"
            value={newAdmin.permissionsText}
            onChange={(e) => setNewAdmin((prev) => ({ ...prev, permissionsText: e.target.value }))}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={Boolean(newAdmin.isActive)}
              onChange={(e) => setNewAdmin((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Active
          </label>
          <button className="btn" onClick={createAdmin} disabled={creating}>
            {creating ? 'Creating...' : 'Create Admin'}
          </button>
        </div>
      </section>

      <div className="toolbar" style={{ marginTop: '0.9rem' }}>
        <input
          type="text"
          placeholder="Search admin/role/permission"
          value={filters.q}
          onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
        />
        <select
          value={filters.role}
          onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
        >
          <option value="">All roles</option>
          {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        <select
          value={filters.active}
          onChange={(e) => setFilters((prev) => ({ ...prev, active: e.target.value }))}
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          className="btn secondary"
          onClick={() => setFilters({ q: '', role: '', active: '' })}
        >
          Reset Filters
        </button>
      </div>

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
                <th>Role Defaults</th>
                <th>Custom Permissions</th>
                <th>Effective Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((admin) => {
                const roleDefaults = getRoleDefaults(admin.role);
                const effective = getEffectivePermissions(admin);
                const selfRow = String(admin._id) === String(currentAdminId);
                return (
                  <tr key={admin._id}>
                    <td>
                      <strong>{admin.displayName || admin.username}</strong>
                      <div>{admin.username}</div>
                      {selfRow ? <span className="badge active">Current Session</span> : null}
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
                        disabled={selfRow}
                        onChange={(e) => updateField(admin._id, 'isActive', e.target.checked)}
                        title={selfRow ? 'You cannot deactivate your current session account' : ''}
                      />
                    </td>
                    <td>
                      <div className="admin-action-row">
                        {roleDefaults.map((permission) => (
                          <span key={permission} className="badge active">{permission}</span>
                        ))}
                        {!roleDefaults.length ? <span>-</span> : null}
                      </div>
                    </td>
                    <td>
                      <div className="admin-action-row" style={{ marginBottom: '0.4rem' }}>
                        {permissionCatalog.map((permission) => (
                          <button
                            key={permission}
                            className={`btn admin-action-btn ${admin.customPermissions.includes(permission) ? 'active' : 'secondary'}`}
                            type="button"
                            onClick={() => togglePermission(admin._id, permission)}
                          >
                            {permission}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        value={admin.permissionsText}
                        onChange={(e) => updateField(admin._id, 'permissionsText', e.target.value)}
                        onBlur={(e) => setCustomPermissions(admin._id, parsePermissionText(e.target.value))}
                        placeholder="workflow:read, rules:read"
                        style={{ width: '100%', minWidth: '240px' }}
                      />
                      <div className="admin-action-row" style={{ marginTop: '0.4rem' }}>
                        <button
                          className="btn admin-action-btn secondary"
                          type="button"
                          onClick={() => setCustomPermissions(admin._id, [])}
                        >
                          Clear Custom
                        </button>
                        <button
                          className="btn admin-action-btn secondary"
                          type="button"
                          onClick={() => setCustomPermissions(admin._id, roleDefaults)}
                        >
                          Copy Role Defaults
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="admin-action-row">
                        {effective.map((permission) => (
                          <span key={permission} className="badge approved">{permission}</span>
                        ))}
                        {!effective.length ? <span>-</span> : null}
                      </div>
                    </td>
                    <td className="admin-actions-cell">
                      <div className="admin-action-row">
                        <button
                          className="btn admin-action-btn"
                          onClick={() => saveAdmin(admin)}
                          disabled={savingId === admin._id || !isDirty(admin)}
                        >
                          {savingId === admin._id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          className="btn admin-action-btn secondary"
                          onClick={() => resetAdmin(admin._id)}
                          disabled={savingId === admin._id || !isDirty(admin)}
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="7">No admins found for current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
