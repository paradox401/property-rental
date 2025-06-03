import React, { useState } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import './PropertyCard.css';

function PropertyCard({ property, onViewDetails, onApplyBooking }) {
  const [isFavorited, setIsFavorited] = useState(false);

  const toggleFavorite = () => setIsFavorited(!isFavorited);

  return (
    <div className="property-card">
      <div className="favorite-icon" onClick={toggleFavorite}>
        {isFavorited ? <FaHeart color="#e63946" /> : <FaRegHeart color="black" />}
      </div>
      <img src={property.image || "/default-property.jpg"} alt={property.title} />
      <div className="property-info">
        <h3>{property.title}</h3>
        <p>{property.location}</p>
        <p>Rs. {property.price}/month</p>
        <button onClick={() => onViewDetails(property)}>View Details</button>
        <button onClick={() => onApplyBooking(property)}>Apply Booking</button>
      </div>
    </div>
  );
}

export default PropertyCard;
