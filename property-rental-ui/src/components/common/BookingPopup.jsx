import React, { useState } from 'react';
import './BookingPopup.css';

export default function BookingPopup({ property, onClose }) {
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const token = localStorage.getItem('token');

  const handleBooking = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ propertyId: property._id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book');

      setSuccess('Booking request sent successfully!');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2>Apply for Booking</h2>
        <p>Are you sure you want to apply for <strong>{property.title}</strong>?</p>
        <button onClick={handleBooking}>Confirm Booking</button>
        {message && <p className="error">{message}</p>}
        {success && <p className="success">{success}</p>}
      </div>
    </div>
  );
}
