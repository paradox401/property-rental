import React, { useEffect, useState } from 'react';
import './Listings.css';

export default function Listings() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) return <p>Loading properties...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="listings-page">
      <h2>Available Properties</h2>
      <div className="listings-grid">
        {properties.map((listing) => (
          <div className="listing-card" key={listing._id}>
            <img src={listing.image || '/default-property.jpg'} alt={listing.title} />
            <div className="listing-info">
              <h3>{listing.title}</h3>
              <p>{listing.location}</p>
              <p>Rs. {listing.price}/month</p>
              <button>View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
