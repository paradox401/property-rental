import React, { useState, useEffect } from 'react';
import './Bookings.css';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8000/api/bookings/owner', {
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
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(({ _id, renter, property, fromDate, toDate, status = 'Pending' }) => (
              <tr key={_id}>
                <td>{renter?.name || renter?.email || 'N/A'}</td>
                <td>{property?.title || 'N/A'}</td>
                <td>{new Date(fromDate).toLocaleDateString()}</td>
                <td>{new Date(toDate).toLocaleDateString()}</td>
                <td className={`status ${status.toLowerCase()}`}>{status}</td>
                <td>
                  {status === 'Pending' ? (
                    <>
                      <button
                        disabled={updatingId === _id}
                        className="btn-approve"
                        onClick={() => handleApprove(_id, 'Approved')}
                      >
                        {updatingId === _id ? 'Approving...' : 'Approve'}
                      </button>
                      <button
                        disabled={updatingId === _id}
                        className="btn-reject"
                        onClick={() => handleReject(_id, 'Rejected')}
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