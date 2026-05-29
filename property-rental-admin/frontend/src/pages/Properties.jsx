import { Fragment, useEffect, useState } from 'react';
import API from '../api';
import Pagination from '../components/Pagination';
import { formatDate, parsePaged, statusClass } from '../utils';
import './Properties.css';

const emptyChecklist = {
  photoQuality: false,
  locationClarity: false,
  duplicateCheck: false,
  priceReasonable: false,
  ownerVerified: false,
};

const checklistLabels = {
  photoQuality: 'Photo quality checked',
  locationClarity: 'Location clarity checked',
  duplicateCheck: 'Duplicate listing checked',
  priceReasonable: 'Price looks reasonable',
  ownerVerified: 'Owner verification checked',
};

const toEditForm = (property) => ({
  title: property.title || '',
  location: property.location || '',
  approximateLocation: property.approximateLocation || '',
  price: property.price || '',
  bedrooms: property.bedrooms || '',
  bathrooms: property.bathrooms || '',
  type: property.type || 'Apartment',
  description: property.description || '',
  image: property.image || '',
  imagesText: Array.isArray(property.images) ? property.images.join('\n') : '',
  parkingAvailable: Boolean(property.parkingAvailable),
  petFriendly: Boolean(property.petFriendly),
});

export default function Properties() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [openPropertyId, setOpenPropertyId] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [reviewForm, setReviewForm] = useState({ checklist: emptyChecklist, note: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const load = async (nextPage = 1) => {
    const res = await API.get('/properties', { params: { q: q || undefined, status: status || undefined, page: nextPage, limit: 20 } });
    const parsed = parsePaged(res.data);
    setRows(parsed.items);
    setMeta(parsed.meta);
  };

  useEffect(() => { load(); }, []);

  const openDetails = (property) => {
    const nextOpen = openPropertyId === property._id ? '' : property._id;
    setOpenPropertyId(nextOpen);
    if (nextOpen) {
      setEditForm(toEditForm(property));
      setReviewForm({
        checklist: { ...emptyChecklist, ...(property.reviewChecklist || {}) },
        note: property.reviewNote || '',
      });
    }
    setError('');
    setMessage('');
  };

  const changeStatus = async (id, nextStatus) => {
    setError('');
    setMessage('');
    try {
      const res = await API.patch(`/properties/${id}/status`, {
        status: nextStatus,
        reviewChecklist: reviewForm.checklist,
        reviewNote: reviewForm.note,
      });
      setRows((prev) => prev.map((item) => (item._id === id ? res.data : item)));
      setMessage(`Property marked ${nextStatus}.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update property status.');
    }
  };

  const saveDetails = async (id) => {
    setError('');
    setMessage('');
    try {
      const payload = {
        ...editForm,
        images: String(editForm.imagesText || '')
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 5),
      };
      delete payload.imagesText;
      const res = await API.put(`/properties/${id}`, payload);
      setRows((prev) => prev.map((item) => (item._id === id ? res.data : item)));
      setEditForm(toEditForm(res.data));
      setMessage('Property details updated.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save property details.');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this property?')) return;
    await API.delete(`/properties/${id}`);
    load(meta.page);
  };

  const toggleChecklist = (key) => {
    setReviewForm((prev) => ({
      ...prev,
      checklist: { ...prev.checklist, [key]: !prev.checklist[key] },
    }));
  };

  return (
    <div className="admin-properties-page">
      <div className="page-header"><div><h1>Properties</h1><p className="page-subtitle">Moderate listings, fix small issues, and approve with a quality checklist.</p></div></div>
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
      {error ? <p className="admin-property-alert error">{error}</p> : null}
      {message ? <p className="admin-property-alert success">{message}</p> : null}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Title</th><th>Owner</th><th>Public Area</th><th>Exact Location</th><th>Type</th><th>Price</th><th>Amenities</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <Fragment key={p._id}>
                <tr>
                  <td>
                    <strong>{p.title}</strong>
                    <small>{p.bedrooms || 0} bed / {p.bathrooms || 0} bath</small>
                  </td>
                  <td>
                    {p.ownerId?.name || '-'}
                    <small>{p.ownerId?.email || ''}</small>
                    <small>{p.ownerId?.ownerVerificationStatus || 'unverified'}</small>
                  </td>
                  <td>{p.approximateLocation || '-'}</td>
                  <td>{p.location}</td>
                  <td>{p.type === 'Condo' ? 'Room' : p.type}</td>
                  <td>Rs. {Number(p.price || 0).toLocaleString()}</td>
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
                      <button className="btn admin-action-btn secondary" onClick={() => openDetails(p)}>
                        {openPropertyId === p._id ? 'Hide' : 'Review/Edit'}
                      </button>
                      <button className="btn admin-action-btn danger" onClick={() => remove(p._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
                {openPropertyId === p._id && editForm ? (
                  <tr>
                    <td colSpan="10">
                      <div className="admin-property-review-panel">
                        <section>
                          <h3>Edit Property</h3>
                          <div className="admin-property-edit-grid">
                            <label><span>Title</span><input value={editForm.title} onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))} /></label>
                            <label><span>Type</span><select value={editForm.type} onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}><option value="Apartment">Flat</option><option value="House">House</option><option value="Condo">Room</option></select></label>
                            <label className="span-2"><span>Exact Location</span><input value={editForm.location} onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))} /></label>
                            <label className="span-2"><span>Approximate Public Location</span><input value={editForm.approximateLocation} onChange={(e) => setEditForm((prev) => ({ ...prev, approximateLocation: e.target.value }))} /></label>
                            <label><span>Price</span><input type="number" value={editForm.price} onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))} /></label>
                            <label><span>Bedrooms</span><input type="number" value={editForm.bedrooms} onChange={(e) => setEditForm((prev) => ({ ...prev, bedrooms: e.target.value }))} /></label>
                            <label><span>Bathrooms</span><input type="number" value={editForm.bathrooms} onChange={(e) => setEditForm((prev) => ({ ...prev, bathrooms: e.target.value }))} /></label>
                            <label><span>Primary Image URL</span><input value={editForm.image} onChange={(e) => setEditForm((prev) => ({ ...prev, image: e.target.value }))} /></label>
                            <label className="span-2"><span>Description</span><textarea value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} /></label>
                            <label className="span-2"><span>Image URLs, one per line</span><textarea value={editForm.imagesText} onChange={(e) => setEditForm((prev) => ({ ...prev, imagesText: e.target.value }))} /></label>
                          </div>
                          <div className="admin-property-toggle-row">
                            <label><input type="checkbox" checked={editForm.parkingAvailable} onChange={(e) => setEditForm((prev) => ({ ...prev, parkingAvailable: e.target.checked }))} /> Parking available</label>
                            <label><input type="checkbox" checked={editForm.petFriendly} onChange={(e) => setEditForm((prev) => ({ ...prev, petFriendly: e.target.checked }))} /> Pet friendly</label>
                          </div>
                          <button className="btn" onClick={() => saveDetails(p._id)}>Save Property Edits</button>
                        </section>

                        <section>
                          <h3>Review Checklist</h3>
                          <div className="admin-property-checklist">
                            {Object.entries(checklistLabels).map(([key, label]) => (
                              <label key={key}>
                                <input type="checkbox" checked={Boolean(reviewForm.checklist[key])} onChange={() => toggleChecklist(key)} />
                                <span>{label}</span>
                              </label>
                            ))}
                          </div>
                          <label className="admin-property-note">
                            <span>Review note</span>
                            <textarea value={reviewForm.note} onChange={(e) => setReviewForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Approval/rejection reason, correction notes, or duplicate details." />
                          </label>
                          <div className="admin-action-row">
                            <button className="btn admin-action-btn" onClick={() => changeStatus(p._id, 'Approved')}>Approve With Checklist</button>
                            <button className="btn admin-action-btn warn" onClick={() => changeStatus(p._id, 'Pending')}>Mark Pending</button>
                            <button className="btn admin-action-btn danger" onClick={() => changeStatus(p._id, 'Rejected')}>Reject</button>
                          </div>
                        </section>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {rows.length === 0 && <tr><td colSpan="10">No properties found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} onPageChange={load} />
    </div>
  );
}
