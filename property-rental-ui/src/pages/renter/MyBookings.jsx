import React, { useState, useEffect } from 'react';
import './MyBookings.css';
import PropertyDetails from '../../components/common/PropertyDetails';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8000/api/bookings/my', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch bookings');

        const data = await res.json();
        setBookings(data);
        console.log('Bookings fetched:', data); // Log the fetched data
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(({ _id, property, fromDate, toDate, status}) => (
              <tr key={_id}>
                <td>{property?.title || 'N/A'}</td>
                <td>{new Date(fromDate).toLocaleDateString()}</td>
                <td>{new Date(toDate).toLocaleDateString()}</td>
                <td>{status || 'N/A'}</td>
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
            <button className="modal-close" onClick={closeModal}>X</button>
            <PropertyDetails id={selectedProperty._id} />
          </div>
        </div>
      )}
    </div>
  );
}
