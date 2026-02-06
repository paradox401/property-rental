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
        prev.map((b) => (b._id === id ? { ...b, status: data.booking.status } : b))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = (id) => updateStatus(id, 'Approved');
  const handleReject = (id) => updateStatus(id, 'Rejected');

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
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(({ _id, renter, property, fromDate, toDate, status = 'Pending', paymentStatus }) => (
              <tr key={_id}>
                <td>{renter?.name || renter?.email || 'N/A'}</td>
                <td>{property?.title || 'N/A'}</td>
                <td>{new Date(fromDate).toLocaleDateString()}</td>
                <td>{new Date(toDate).toLocaleDateString()}</td>
                <td className={`status ${status.toLowerCase()}`}>{status}</td>
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
