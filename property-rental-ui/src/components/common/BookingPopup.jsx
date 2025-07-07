import React, { useState } from 'react';
import './BookingPopup.css';

export default function BookingPopup({ property, onClose }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  const handleBooking = async () => {
    setMessage('');
    setSuccess('');

    if (!fromDate || !toDate) {
      setMessage('Please select both from and to dates.');
      return;
    }

    if (new Date(toDate) < new Date(fromDate)) {
      setMessage('To Date cannot be before From Date.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`http://localhost:8000/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyId: property._id,
          fromDate,
          toDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to book');

      setSuccess('Booking request sent successfully!');

      // Optionally close popup after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear messages on close to reset popup state cleanly
  const handleClose = () => {
    setMessage('');
    setSuccess('');
    setFromDate('');
    setToDate('');
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>
          &times;
        </button>
        <h2>Apply for Booking</h2>
        <p>
          Are you sure you want to apply for <strong>{property.title}</strong>?
        </p>

        <label>From Date:</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />

        <label>To Date:</label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

        <button onClick={handleBooking} disabled={loading}>
          {loading ? 'Processing...' : 'Confirm Booking'}
        </button>

        {message && <p className="error">{message}</p>}
        {success && <p className="success">{success}</p>}
      </div>
    </div>
  );
}
