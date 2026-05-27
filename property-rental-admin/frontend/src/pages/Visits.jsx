import { useEffect, useMemo, useState } from 'react';
import API from '../api';
import Pagination from '../components/Pagination';
import { formatDate, parsePaged, statusClass } from '../utils';
import './Visits.css';

export default function Visits() {
  const [passes, setPasses] = useState([]);
  const [visits, setVisits] = useState([]);
  const [passMeta, setPassMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [visitMeta, setVisitMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [status, setStatus] = useState('');
  const [visitStatus, setVisitStatus] = useState('');
  const [remarks, setRemarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const summary = useMemo(() => ({
    pending: passes.filter((item) => item.status === 'pending_payment').length,
    active: passes.filter((item) => item.status === 'active').length,
    rejected: passes.filter((item) => item.status === 'rejected').length,
    scheduled: visits.filter((item) => item.status === 'scheduled').length,
  }), [passes, visits]);

  const loadPasses = async (nextPage = 1) => {
    const res = await API.get('/visits/passes', {
      params: { status: status || undefined, page: nextPage, limit: 20 },
    });
    const parsed = parsePaged(res.data);
    setPasses(parsed.items);
    setPassMeta(parsed.meta);
  };

  const loadVisits = async (nextPage = 1) => {
    const res = await API.get('/visits', {
      params: { status: visitStatus || undefined, page: nextPage, limit: 20 },
    });
    const parsed = parsePaged(res.data);
    setVisits(parsed.items);
    setVisitMeta(parsed.meta);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadPasses(1), loadVisits(1)]);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const decidePass = async (id, decision) => {
    setError('');
    try {
      await API.patch(`/visits/passes/${id}/${decision}`, {
        adminRemark: remarks[id] || '',
      });
      await Promise.all([loadPasses(passMeta.page), loadVisits(visitMeta.page)]);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || `Failed to ${decision} visit pass`);
    }
  };

  if (loading) return <p>Loading visit controls...</p>;

  return (
    <div className="visits-admin-page">
      <div className="page-header">
        <div>
          <h1>Visits</h1>
          <p className="page-subtitle">Approve QR visit pass payments, generate promo codes, and monitor scheduled property visits.</p>
        </div>
      </div>

      {error && <p className="visit-admin-error">{error}</p>}

      <section className="visit-summary-grid">
        <article><span>Pending pass payments</span><strong>{summary.pending}</strong></article>
        <article><span>Active promo passes</span><strong>{summary.active}</strong></article>
        <article><span>Rejected payments</span><strong>{summary.rejected}</strong></article>
        <article><span>Scheduled visits</span><strong>{summary.scheduled}</strong></article>
      </section>

      <section className="visit-admin-section">
        <div className="visit-admin-section-head">
          <div>
            <h2>Visit pass payment requests</h2>
            <p>Verify QR payments and approve to send a promo code notification to the renter.</p>
          </div>
          <div className="toolbar">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All pass status</option>
              <option value="pending_payment">Pending payment</option>
              <option value="active">Active</option>
              <option value="consumed">Consumed</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="btn" onClick={() => loadPasses(1)}>Apply</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table visit-admin-table">
            <thead>
              <tr>
                <th>Renter</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Property</th>
                <th>Requested Visit</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Promo</th>
                <th>Remark</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((pass) => (
                <tr key={pass._id}>
                  <td>
                    <strong>{pass.renter?.name || '-'}</strong>
                    <small>{pass.renter?.citizenshipNumber || ''}</small>
                  </td>
                  <td>{pass.contactPhone || '-'}</td>
                  <td>{pass.renter?.email || '-'}</td>
                  <td>{pass.requestedForProperty?.title || '-'}</td>
                  <td>{formatDate(pass.requestedVisitDate)}</td>
                  <td>Rs. {pass.amount}</td>
                  <td>{pass.transactionRef || '-'}</td>
                  <td><span className={`badge ${statusClass(pass.status)}`}>{pass.status}</span></td>
                  <td>{pass.promoCode || '-'}</td>
                  <td>
                    <input
                      className="remark-input"
                      value={remarks[pass._id] || ''}
                      onChange={(e) => setRemarks((prev) => ({ ...prev, [pass._id]: e.target.value }))}
                      placeholder={pass.adminRemark || 'Optional'}
                    />
                  </td>
                  <td>
                    {pass.status === 'pending_payment' ? (
                      <div className="visit-actions">
                        <button className="btn action-btn paid-btn" onClick={() => decidePass(pass._id, 'approve')}>Approve</button>
                        <button className="btn action-btn danger" onClick={() => decidePass(pass._id, 'reject')}>Reject</button>
                      </div>
                    ) : (
                      <span className="muted-text">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
              {passes.length === 0 && <tr><td colSpan="11">No visit pass requests found.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination meta={passMeta} onPageChange={loadPasses} />
      </section>

      <section className="visit-admin-section">
        <div className="visit-admin-section-head">
          <div>
            <h2>Scheduled property visits</h2>
            <p>See which renter is visiting which property and when.</p>
          </div>
          <div className="toolbar">
            <select value={visitStatus} onChange={(e) => setVisitStatus(e.target.value)}>
              <option value="">All visit status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="booking_pending">Booking pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="btn" onClick={() => loadVisits(1)}>Apply</button>
          </div>
        </div>

        <div className="visit-card-grid">
          {visits.map((visit) => (
            <article className="visit-admin-card" key={visit._id}>
              <div>
                <h3>{visit.property?.title || 'Property'}</h3>
                <p>{visit.property?.location || 'Location not provided'}</p>
              </div>
              <dl>
                <dt>Renter</dt><dd>{visit.renter?.name || '-'}</dd>
                <dt>Phone</dt><dd>{visit.visitPass?.contactPhone || '-'}</dd>
                <dt>Email</dt><dd>{visit.renter?.email || '-'}</dd>
                <dt>Owner</dt><dd>{visit.owner?.name || '-'}</dd>
                <dt>Date</dt><dd>{formatDate(visit.visitDate)}</dd>
                <dt>Promo</dt><dd>{visit.promoCode}</dd>
                <dt>Status</dt><dd>{visit.status}</dd>
                <dt>Renter Done</dt><dd>{visit.renterMarkedDoneAt ? 'Yes' : 'No'}</dd>
                <dt>Owner Done</dt><dd>{visit.ownerMarkedDoneAt ? 'Yes' : 'No'}</dd>
                <dt>Booking Fee</dt><dd>{visit.bookingConfirmationStatus === 'none' ? 'None' : `Rs. ${visit.bookingConfirmationAmount || 0} (${visit.bookingConfirmationStatus})`}</dd>
              </dl>
            </article>
          ))}
          {visits.length === 0 && <p>No scheduled visits found.</p>}
        </div>
        <Pagination meta={visitMeta} onPageChange={loadVisits} />
      </section>
    </div>
  );
}
