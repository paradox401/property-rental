import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import './Bookings.css';

const jsonHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export default function Bookings() {
  const { token } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [renewingId, setRenewingId] = useState('');
  const [activeBookingId, setActiveBookingId] = useState('');
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [amendments, setAmendments] = useState([]);
  const [ledger, setLedger] = useState({ summary: null, items: [] });
  const [depositForm, setDepositForm] = useState({ amount: '', reason: '' });
  const [deductionForm, setDeductionForm] = useState({ amount: '', reason: '' });

  const fetchBookings = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/api/bookings/owner`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch bookings');
    setBookings(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const run = async () => {
      try {
        if (!token) {
          setError('Please log in to view bookings.');
          return;
        }
        await fetchBookings();
      } catch (err) {
        setError(err.message || 'Failed to fetch bookings');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  const loadPanel = async (bookingId) => {
    if (!token) return;
    try {
      setPanelError('');
      setPanelLoading(true);
      const [amendRes, ledgerRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/bookings/${bookingId}/amendments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/bookings/${bookingId}/deposit-ledger`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const amendData = await amendRes.json();
      const ledgerData = await ledgerRes.json();
      if (!amendRes.ok) throw new Error(amendData.error || 'Failed to load amendments');
      if (!ledgerRes.ok) throw new Error(ledgerData.error || 'Failed to load deposit ledger');
      setAmendments(amendData.items || []);
      setLedger({
        summary: ledgerData.summary || null,
        items: ledgerData.items || [],
      });
    } catch (err) {
      setPanelError(err.message || 'Failed to load controls');
      setAmendments([]);
      setLedger({ summary: null, items: [] });
    } finally {
      setPanelLoading(false);
    }
  };

  const toggleManage = async (bookingId) => {
    if (activeBookingId === bookingId) {
      setActiveBookingId('');
      return;
    }
    setActiveBookingId(bookingId);
    await loadPanel(bookingId);
  };

  const updateStatus = async (id, status) => {
    if (!token) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: jsonHeaders(token),
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      setBookings((prev) => prev.map((b) => (b._id === id ? data.booking : b)));
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRenew = async (id) => {
    if (!token) return;
    setRenewingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${id}/renew`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ months: 1 }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to renew booking');
      setBookings((prev) => prev.map((booking) => (booking._id === id ? payload.booking : booking)));
      if (activeBookingId === id) await loadPanel(id);
    } catch (err) {
      setError(err.message || 'Failed to renew booking');
    } finally {
      setRenewingId('');
    }
  };

  const cancelBooking = async (id) => {
    if (!token) return;
    const reason = window.prompt('Cancellation reason (optional):', '') || '';
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${id}/cancel`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ reason }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to cancel booking');
      await fetchBookings();
      window.alert(`Cancelled. Penalty Rs ${payload?.cancellation?.penaltyAmount || 0}`);
    } catch (err) {
      setError(err.message || 'Failed to cancel booking');
    }
  };

  const decideAmendment = async (bookingId, amendmentId, status) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/amendments/${amendmentId}`, {
        method: 'PATCH',
        headers: jsonHeaders(token),
        body: JSON.stringify({ status }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to update amendment');
      await loadPanel(bookingId);
      await fetchBookings();
    } catch (err) {
      setPanelError(err.message || 'Failed to update amendment');
    }
  };

  const receiveDeposit = async (bookingId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/deposit-ledger/receive`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({
          amount: Number(depositForm.amount || 0),
          reason: depositForm.reason || 'Security deposit received',
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to record deposit');
      setDepositForm({ amount: '', reason: '' });
      await loadPanel(bookingId);
    } catch (err) {
      setPanelError(err.message || 'Failed to record deposit');
    }
  };

  const addDeduction = async (bookingId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/deposit-ledger/deduction`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({
          amount: Number(deductionForm.amount || 0),
          reason: deductionForm.reason,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to add deduction');
      setDeductionForm({ amount: '', reason: '' });
      await loadPanel(bookingId);
    } catch (err) {
      setPanelError(err.message || 'Failed to add deduction');
    }
  };

  const decideLedger = async (bookingId, entryId, status) => {
    if (!token) return;
    try {
      let endpoint = `${API_BASE_URL}/api/bookings/${bookingId}/deposit-ledger/${entryId}/${status === 'approved' ? 'approve' : 'reject'}`;
      let method = 'PATCH';
      if (status === 'paid') {
        endpoint = `${API_BASE_URL}/api/bookings/${bookingId}/deposit-ledger/${entryId}/mark-paid`;
        method = 'POST';
      }
      const res = await fetch(endpoint, {
        method,
        headers: jsonHeaders(token),
        body: JSON.stringify({ note: `Owner ${status}` }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to update ledger entry');
      await loadPanel(bookingId);
    } catch (err) {
      setPanelError(err.message || 'Failed to update entry');
    }
  };

  const renderTimeline = (workflow) => {
    const steps = Array.isArray(workflow?.steps) ? workflow.steps : [];
    if (!steps.length) return <span className="timeline-label">Requested</span>;
    return (
      <div className="booking-timeline-wrap">
        <div className="booking-timeline">
          {steps.map((step) => (
            <span
              key={step.key}
              className={`timeline-node ${step.completed ? 'completed' : ''} ${step.active ? 'active' : ''}`}
              title={step.label}
            />
          ))}
        </div>
        <span className={`timeline-label ${workflow?.stage === 'rejected' ? 'rejected' : ''}`}>
          {workflow?.label || 'Requested'}
        </span>
      </div>
    );
  };

  if (loading) return <p>Loading bookings...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="bookings-container">
      <h2>Booking Requests</h2>
      {bookings.length === 0 ? (
        <p>No booking requests found.</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Property</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
              <th>Timeline</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(({ _id, renter, property, fromDate, toDate, status = 'Pending', paymentStatus, workflow, renewalStatus }) => (
              <React.Fragment key={_id}>
                <tr>
                  <td>{renter?.name || renter?.email || 'N/A'}</td>
                  <td>{property?.title || 'N/A'}</td>
                  <td>{new Date(fromDate).toLocaleDateString()}</td>
                  <td>{new Date(toDate).toLocaleDateString()}</td>
                  <td className={`status ${String(status).toLowerCase()}`}>{status}</td>
                  <td>{renderTimeline(workflow)}</td>
                  <td>{paymentStatus || 'pending'}</td>
                  <td>
                    <div className="booking-actions">
                      {status === 'Pending' ? (
                        <>
                          <button disabled={updatingId === _id} className="btn-approve" onClick={() => updateStatus(_id, 'Approved')}>Approve</button>
                          <button disabled={updatingId === _id} className="btn-reject" onClick={() => updateStatus(_id, 'Rejected')}>Reject</button>
                        </>
                      ) : null}
                      {status === 'Approved' ? (
                        <button className="btn-approve" disabled={renewingId === _id || renewalStatus === 'pending'} onClick={() => handleRenew(_id)}>
                          {renewalStatus === 'pending' ? 'Renewal Requested' : renewingId === _id ? 'Renewing...' : 'Renew +1M'}
                        </button>
                      ) : null}
                      {(status === 'Pending' || status === 'Approved') ? (
                        <button className="btn-reject" onClick={() => cancelBooking(_id)}>Cancel</button>
                      ) : null}
                      <button className="btn-approve" onClick={() => toggleManage(_id)}>
                        {activeBookingId === _id ? 'Hide Manage' : 'Manage'}
                      </button>
                    </div>
                  </td>
                </tr>
                {activeBookingId === _id ? (
                  <tr>
                    <td colSpan="8">
                      <div className="booking-panel">
                        {panelLoading ? <p>Loading controls...</p> : null}
                        {panelError ? <p className="error">{panelError}</p> : null}
                        {!panelLoading ? (
                          <>
                            <h4>Lease Amendments</h4>
                            <div className="booking-chip-list">
                              {amendments.map((a) => (
                                <div key={a._id} className="booking-chip">
                                  {a.status.toUpperCase()} | {a.reason || 'No reason'} | Rent: {a.proposedMonthlyRent ?? '-'}
                                  {a.status === 'pending' ? (
                                    <>
                                      <button className="btn-approve" onClick={() => decideAmendment(_id, a._id, 'approved')}>Approve</button>
                                      <button className="btn-reject" onClick={() => decideAmendment(_id, a._id, 'rejected')}>Reject</button>
                                    </>
                                  ) : null}
                                </div>
                              ))}
                              {amendments.length === 0 ? <span className="booking-chip">No amendment history.</span> : null}
                            </div>

                            <h4>Deposit Ledger</h4>
                            {ledger.summary ? (
                              <p className="workflow-hint">
                                Held Rs {ledger.summary.netHeld} | Received Rs {ledger.summary.received} | Pending Rs {ledger.summary.pending}
                              </p>
                            ) : null}
                            <div className="booking-panel-grid">
                              <input type="number" placeholder="Deposit amount" value={depositForm.amount} onChange={(e) => setDepositForm((p) => ({ ...p, amount: e.target.value }))} />
                              <input type="text" placeholder="Deposit note" value={depositForm.reason} onChange={(e) => setDepositForm((p) => ({ ...p, reason: e.target.value }))} />
                              <button className="btn-approve" onClick={() => receiveDeposit(_id)}>Record Deposit</button>
                            </div>
                            <div className="booking-panel-grid">
                              <input type="number" placeholder="Deduction amount" value={deductionForm.amount} onChange={(e) => setDeductionForm((p) => ({ ...p, amount: e.target.value }))} />
                              <input type="text" placeholder="Deduction reason" value={deductionForm.reason} onChange={(e) => setDeductionForm((p) => ({ ...p, reason: e.target.value }))} />
                              <button className="btn-reject" onClick={() => addDeduction(_id)}>Add Deduction</button>
                            </div>
                            <div className="booking-chip-list">
                              {(ledger.items || []).map((entry) => (
                                <div key={entry._id} className="booking-chip">
                                  {entry.type} | Rs {entry.amount} | {entry.status}
                                  {entry.status === 'pending' ? (
                                    <>
                                      <button className="btn-approve" onClick={() => decideLedger(_id, entry._id, 'approved')}>Approve</button>
                                      <button className="btn-reject" onClick={() => decideLedger(_id, entry._id, 'rejected')}>Reject</button>
                                    </>
                                  ) : null}
                                  {entry.type === 'refund_requested' && entry.status === 'approved' ? (
                                    <button className="btn-approve" onClick={() => decideLedger(_id, entry._id, 'paid')}>Mark Paid</button>
                                  ) : null}
                                </div>
                              ))}
                              {(ledger.items || []).length === 0 ? <span className="booking-chip">No deposit entries.</span> : null}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
