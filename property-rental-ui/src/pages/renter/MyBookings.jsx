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
              <th>Payment</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(({ _id, property, fromDate, toDate, status, paymentStatus }) => (
              <tr key={_id}>
                <td>{property?.title || 'N/A'}</td>
                <td>{new Date(fromDate).toLocaleDateString()}</td>
                <td>{new Date(toDate).toLocaleDateString()}</td>
                <td>{status || 'N/A'}</td>
                <td>
                  {paymentStatus === 'pending_verification'
                    ? 'pending verification'
                    : paymentStatus || 'pending'}
                </td>
                <td>
                  <button onClick={() => onViewDetails(property)}>View Details</button>
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
