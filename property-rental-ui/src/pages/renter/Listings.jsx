import React, { useEffect, useState } from 'react';
import PropertyCard from '../../components/common/PropertyCard';
import './Listings.css';
import PropertyDetails from '../../components/common/PropertyDetails';
import BookingPopup from '../../components/common/BookingPopup';

export default function Listings() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showDetailsId, setShowDetailsId] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null); // for booking popup

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/properties');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch properties');
        setProperties(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const closeDetailsModal = () => setShowDetailsId(null);
  const openBookingPopup = (property) => setSelectedProperty(property);
  const closeBookingPopup = () => setSelectedProperty(null);

  if (loading) return <p>Loading properties...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="listings-page">
      <h2>Available Properties</h2>
      <div className="listings-grid">
        {properties.map((listing) => (
          <PropertyCard
            key={listing._id}
            property={listing}
            onViewDetails={() => setShowDetailsId(listing._id)}
            onApplyBooking={() => openBookingPopup(listing)}
          />
        ))}
      </div>

      {showDetailsId && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDetailsModal}>X</button>
            <PropertyDetails id={showDetailsId} />
          </div>
        </div>
      )}

      {selectedProperty && (
        <BookingPopup
          property={selectedProperty}
          onClose={closeBookingPopup}
        />
      )}
    </div>
  );
}
