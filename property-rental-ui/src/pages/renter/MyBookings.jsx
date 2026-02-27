import React, { useContext, useEffect, useState } from 'react';
import './MyBookings.css';
import PropertyDetails from '../../components/common/PropertyDetails';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

export default function Bookings() {
  const { token } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [renewingId, setRenewingId] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        if (!token) {
          setError('Please log in to view bookings.');
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/bookings/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch bookings');

        const data = await res.json();
        setBookings(data);
      } catch (err) {
        setError(err.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [token]);

  const onViewDetails = (property) => {
    setSelectedProperty(property);
  };

  const closeModal = () => {
    setSelectedProperty(null);
  };

  const renewBooking = async (bookingId) => {
    if (!token) return;
    setRenewingId(bookingId);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/renew`, {
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
        prev.map((booking) => (booking._id === bookingId ? payload.booking : booking))
      );
    } catch (err) {
      setError(err.message || 'Failed to request renewal');
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
      return 'Booking was rejected. Find another listing or contact owner.';
    }
    if (stage === 'requested' || status === 'Pending') {
      return 'Waiting for owner approval.';
    }
    if (stage === 'accepted' && !workflow?.flags?.agreementSigned) {
      return 'Open Agreements page and sign the rental agreement.';
    }
    if (stage === 'agreement_signed' && !workflow?.flags?.paid) {
      if (paymentStatus === 'pending_verification') {
        return 'Payment submitted. Waiting for admin verification.';
      }
      return 'Go to Payments page and submit rent payment.';
    }
    if (stage === 'paid' && !workflow?.flags?.movedIn) {
      return 'Payment complete. Move-in starts on booking date.';
    }
    if (stage === 'moved_in') {
      return 'Booking completed. You are moved in.';
    }
    return 'Continue completing booking steps.';
  };

  return (
    <div className="bookings-container">
      <h2>My Bookings</h2>
      {loading ? (
        <p>Loading bookings...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
              <th>Timeline</th>
              <th>Next Step</th>
              <th>Payment</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(({ _id, property, fromDate, toDate, status, paymentStatus, workflow, renewalStatus }) => (
              <tr key={_id}>
                <td>{property?.title || 'N/A'}</td>
                <td>{new Date(fromDate).toLocaleDateString()}</td>
                <td>{new Date(toDate).toLocaleDateString()}</td>
                <td>{status || 'N/A'}</td>
                <td>{renderTimeline(workflow)}</td>
                <td>
                  <span className="workflow-hint">{getWorkflowHint({ status, paymentStatus, workflow })}</span>
                </td>
                <td>
                  {paymentStatus === 'pending_verification'
                    ? 'pending verification'
                    : paymentStatus || 'pending'}
                </td>
                <td>
                  <div className="booking-actions">
                    <button onClick={() => onViewDetails(property)}>View Details</button>
                    {status === 'Approved' && (
                      <button
                        className="btn-renew"
                        disabled={renewingId === _id || renewalStatus === 'pending'}
                        onClick={() => renewBooking(_id)}
                      >
                        {renewalStatus === 'pending'
                          ? 'Renewal Pending'
                          : renewingId === _id
                            ? 'Requesting...'
                            : 'Renew +1M'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedProperty && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Close popup" title="Close">
              ✕
            </button>
            <PropertyDetails id={selectedProperty._id} />
          </div>
        </div>
      )}
    </div>
  );
}
