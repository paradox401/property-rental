import React, { useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import './PropertyDetails.css';

export default function PropertyDetails({ id }) {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(null);
  const [rated, setRated] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/properties/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch property');

        setProperty(data);

        // Set user’s previous rating if exists
        if (data.userRating) {
          setRating(data.userRating);
          setRated(true);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id, token]);

  const submitRating = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/properties/${id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit rating');

      setRated(true);
      setProperty(prev => ({
        ...prev,
        rating: data.rating,
        numRatings: (prev.numRatings || 0) + 1
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!property) return <p>No property found</p>;

  return (
    <div className="property-details-popup">
      <h2>{property.title}</h2>
      <img src={property.image || "/default-property.jpg"} alt={property.title} />
      <p><strong>Location:</strong> {property.location}</p>
      <p><strong>Rent:</strong> Rs. {property.price}/month</p>
      <p><strong>Description:</strong> {property.description}</p>
      <p><strong>Status:</strong> {property.status}</p>

      <div className="property-rating">
        <strong>Average Rating:</strong>
        {[...Array(5)].map((_, i) => (
          <FaStar key={i} color={i < Math.round(property.rating) ? '#FFD700' : '#ccc'} />
        ))}
        <span> ({property.numRatings || 0})</span>
      </div>

      {rated && <p>✅ You rated this property {rating} stars.</p>}

      {!rated && (
        <div className="rating-form">
          <h4>Rate this property</h4>
          {[...Array(5)].map((_, i) => {
            const value = i + 1;
            return (
              <FaStar
                key={i}
                size={25}
                color={value <= (hover || rating) ? '#FFD700' : '#ccc'}
                onMouseEnter={() => setHover(value)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setRating(value)}
                style={{ cursor: 'pointer', marginRight: '5px' }}
              />
            );
          })}
          <button onClick={submitRating} disabled={!rating}>Submit Rating</button>
        </div>
      )}
    </div>
  );
}
