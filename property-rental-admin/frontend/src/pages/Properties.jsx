import { Fragment, useEffect, useState } from 'react';
import API from '../api';
import Pagination from '../components/Pagination';
import { formatDate, parsePaged, statusClass } from '../utils';

export default function Properties() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [openPropertyId, setOpenPropertyId] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const load = async (nextPage = 1) => {
    const res = await API.get('/properties', { params: { q: q || undefined, status: status || undefined, page: nextPage, limit: 20 } });
    const parsed = parsePaged(res.data);
    setRows(parsed.items);
    setMeta(parsed.meta);
  };

  useEffect(() => { load(); }, []);

  const changeStatus = async (id, nextStatus) => {
    await API.patch(`/properties/${id}/status`, { status: nextStatus });
    load(meta.page);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this property?')) return;
    await API.delete(`/properties/${id}`);
    load(meta.page);
  };

  return (
    <div>
      <div className="page-header"><div><h1>Properties</h1><p className="page-subtitle">Moderate listings and enforce listing quality.</p></div></div>
      <section className="ops-summary-grid">
        <article><span>Visible Listings</span><strong>{rows.length}</strong></article>
        <article><span>Pending</span><strong>{rows.filter((p) => p.status === 'Pending').length}</strong></article>
        <article><span>Approved</span><strong>{rows.filter((p) => p.status === 'Approved').length}</strong></article>
        <article><span>Rejected</span><strong>{rows.filter((p) => p.status === 'Rejected').length}</strong></article>
      </section>
      <div className="toolbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title/location/description" />
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
          <thead><tr><th>Title</th><th>Owner</th><th>Location</th><th>Type</th><th>Price</th><th>Amenities</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <Fragment key={p._id}>
                <tr key={p._id}>
                  <td>
                    <strong>{p.title}</strong>
                    <small>{p.bedrooms || 0} bed / {p.bathrooms || 0} bath</small>
                  </td>
                  <td>
                    {p.ownerId?.name || '-'}
                    <small>{p.ownerId?.email || ''}</small>
                    <small>{p.ownerId?.ownerVerificationStatus || 'unverified'}</small>
                  </td>
                  <td>{p.location}</td>
                  <td>{p.type}</td>
                  <td>Rs. {p.price}</td>
                  <td>
                    <div className="compact-stat-list">
                      <span>{p.parkingAvailable ? 'Parking' : 'No parking'}</span>
                      <span>{p.petFriendly ? 'Pets' : 'No pets'}</span>
                      <span>{(p.images?.length || (p.image ? 1 : 0))} imgs</span>
                    </div>
                  </td>
                  <td><span className={`badge ${statusClass(p.status)}`}>{p.status}</span></td>
                  <td>{formatDate(p.createdAt)}</td>
                  <td className="admin-actions-cell">
                    <div className="admin-action-row">
                      <button className="btn admin-action-btn" onClick={() => changeStatus(p._id, 'Approved')}>Approve</button>
                      <button className="btn admin-action-btn warn" onClick={() => changeStatus(p._id, 'Pending')}>Pending</button>
                      <button className="btn admin-action-btn danger" onClick={() => changeStatus(p._id, 'Rejected')}>Reject</button>
                      <button className="btn admin-action-btn secondary" onClick={() => setOpenPropertyId(openPropertyId === p._id ? '' : p._id)}>
                        {openPropertyId === p._id ? 'Hide' : 'Details'}
                      </button>
                      <button className="btn admin-action-btn danger" onClick={() => remove(p._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
                {openPropertyId === p._id ? (
                  <tr key={`${p._id}-details`}>
                    <td colSpan="9">
                      <div className="admin-detail-panel">
                        <dl>
                          <dt>Description</dt><dd>{p.description || '-'}</dd>
                          <dt>Owner</dt><dd>{p.ownerId?.name || '-'} ({p.ownerId?.email || 'no email'})</dd>
                          <dt>Quality</dt><dd>{p.image || p.images?.length ? 'Has media' : 'Missing property photos'} | Rating {p.rating || 0}</dd>
                          <dt>Amenities</dt><dd>{p.parkingAvailable ? 'Parking available' : 'Parking not available'}; {p.petFriendly ? 'Pet friendly' : 'Not pet friendly'}</dd>
                          <dt>Moderation</dt><dd>{p.status === 'Pending' ? 'Needs admin review before appearing in renter listings.' : 'Listing has already been reviewed.'}</dd>
                        </dl>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {rows.length === 0 && <tr><td colSpan="9">No properties found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} onPageChange={load} />
    </div>
  );
}
