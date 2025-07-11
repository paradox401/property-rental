import React, { useState, useEffect, useContext } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import './PropertyCard.css';
import { AuthContext } from '../../context/AuthContext';

function PropertyCard({ property, onViewDetails, onApplyBooking }) {
  const { token } = useContext(AuthContext);
  const [isFavorited, setIsFavorited] = useState(false);

  const handleFavoriteClick = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ propertyId: property._id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to favorite');
      }

      setIsFavorited(true);
    } catch (err) {
      console.error('Favorite error:', err.message);
    }
  };

useEffect(() => {
  const checkFavorite = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/favorites/check/${property._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      // ✅ Ensure correct type checking
      if (res.ok && typeof data.isFavorited === 'boolean') {
        setIsFavorited(data.isFavorited);
      } else {
        setIsFavorited(false);
      }
    } catch (err) {
      console.error('Error checking favorite:', err.message);
      setIsFavorited(false);
    }
  };

  if (token) checkFavorite();
}, [property._id, token]);


  return (
    <div className="property-card">
      <img src={property.image || "/default-property.jpg"} alt={property.title} />
      <div className="property-info">
        <h3>{property.title}</h3>
        <p>{property.location}</p>
        <p>Rs. {property.price}/month</p>

        <div className="property-actions">
          <div className="action-buttons">
            <button onClick={() => onViewDetails(property)}>View Details</button>
            <button onClick={() => onApplyBooking(property)}>Apply Booking</button>
          </div>
          <div
            className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
            onClick={handleFavoriteClick}
            role="button"
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleFavoriteClick()}
          >
            {isFavorited ? <FaHeart /> : <FaRegHeart />}
          </div>

        </div>
      </div>
    </div>
  );
}

export default PropertyCard;
