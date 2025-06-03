import React, { useEffect, useState } from 'react';
import './PropertyDetails.css';

export default function PropertyDetails({ id }) {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/properties/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch property');
        setProperty(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!property) return <p>No property found</p>;

  return (
    <div className="property-details-popup">
      <h2>{property.title}</h2>
      <img src={property.image} alt={property.title} />
      <p><strong>Location:</strong> {property.location}</p>
      <p><strong>Rent:</strong> Rs. {property.price}/month</p>
      <p><strong>Description:</strong> {property.description}</p>
    </div>
  );
}
