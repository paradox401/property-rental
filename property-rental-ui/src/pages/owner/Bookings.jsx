import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import './Bookings.css';

export default function Bookings() {
  const { token } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [renewingId, setRenewingId] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        if (!token) {
          setError('Please log in to view bookings.');
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/bookings/owner`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch bookings');

        const data = await res.json();
        setBookings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [token]);

  const updateStatus = async (id, status) => {
    if (!token) return;

    setUpdatingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      const data = await res.json();

      setBookings((prev) =>
        prev.map((b) => (b._id === id ? data.booking : b))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = (id) => updateStatus(id, 'Approved');
  const handleReject = (id) => updateStatus(id, 'Rejected');

  const handleRenew = async (id) => {
    if (!token) return;
    setRenewingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${id}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ months: 1 }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to renew booking');
      setBookings((prev) =>
        prev.map((booking) => (booking._id === id ? payload.booking : booking))
      );
    } catch (err) {
      setError(err.message || 'Failed to renew booking');
    } finally {
      setRenewingId('');
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

  const getWorkflowHint = (booking) => {
    const workflow = booking?.workflow;
    const stage = workflow?.stage || 'requested';
    const status = booking?.status || 'Pending';
    const paymentStatus = String(booking?.paymentStatus || 'pending').toLowerCase();

    if (stage === 'rejected' || status === 'Rejected') {
      return 'Booking rejected. No further action required.';
    }
    if (stage === 'requested' || status === 'Pending') {
      return 'Review request and approve/reject this booking.';
    }
    if (stage === 'accepted' && !workflow?.flags?.agreementSigned) {
      return 'Generate agreement (if needed) and sign it as owner.';
    }
    if (stage === 'agreement_signed' && !workflow?.flags?.paid) {
      if (paymentStatus === 'pending_verification') {
        return 'Renter payment submitted. Waiting for admin verification.';
      }
      return 'Wait for renter to submit payment request.';
    }
    if (stage === 'paid' && !workflow?.flags?.movedIn) {
      return 'Payment is complete. Prepare handover for move-in date.';
    }
    if (stage === 'moved_in') {
      return 'Booking completed. Tenant has moved in.';
    }
    return 'Track booking progress.';
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
              <th>Next Step</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(({ _id, renter, property, fromDate, toDate, status = 'Pending', paymentStatus, workflow, renewalStatus }) => (
              <tr key={_id}>
                <td>{renter?.name || renter?.email || 'N/A'}</td>
                <td>{property?.title || 'N/A'}</td>
                <td>{new Date(fromDate).toLocaleDateString()}</td>
                <td>{new Date(toDate).toLocaleDateString()}</td>
                <td className={`status ${status.toLowerCase()}`}>{status}</td>
                <td>{renderTimeline(workflow)}</td>
                <td>
                  <span className="workflow-hint">{getWorkflowHint({ status, paymentStatus, workflow })}</span>
                </td>
                <td>{paymentStatus || 'pending'}</td>
                <td>
                  {status === 'Pending' ? (
                    <>
                      <button
                        disabled={updatingId === _id}
                        className="btn-approve"
                        onClick={() => handleApprove(_id)}
                      >
                        {updatingId === _id ? 'Approving...' : 'Approve'}
                      </button>
                      <button
                        disabled={updatingId === _id}
                        className="btn-reject"
                        onClick={() => handleReject(_id)}
                      >
                        {updatingId === _id ? 'Rejecting...' : 'Reject'}
                      </button>
                    </>
                  ) : status === 'Approved' ? (
                    <button
                      className="btn-approve"
                      disabled={renewingId === _id || renewalStatus === 'pending'}
                      onClick={() => handleRenew(_id)}
                    >
                      {renewalStatus === 'pending'
                        ? 'Renewal Requested'
                        : renewingId === _id
                          ? 'Renewing...'
                          : 'Renew +1M'}
                    </button>
                  ) : (
                    <span>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
