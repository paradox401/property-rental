import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import './Favorites.css';

export default function Favorites() {
  const { token } = useContext(AuthContext);
  const [favorites, setFavorites] = useState([]);
  const [error, setError] = useState('');
  const validFavorites = favorites.filter(Boolean);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        if (!token) {
          setError('Please log in to view favorites.');
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load favorites');
        setFavorites(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchFavorites();
  }, [token]);

  const removeFavorite = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/favorites/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFavorites((prev) => prev.filter((p) => p && p._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="favorites-container">
      <h1>My Favorites</h1>
      {error && <p className="error">{error}</p>}
      {validFavorites.length === 0 ? (
        <p>No favorite properties found.</p>
      ) : (
        <div className="favorites-grid">
          {validFavorites.map((property) => (
            <div className="favorite-card" key={property._id}>
              <img
                src={property.image || '/default-image.jpg'}
                alt={property.title || 'Property image'}
              />
              <h3>{property.title}</h3>
              <p>Location: {property.location}</p>
              <p>Price: Rs. {property.price}</p>
              <button onClick={() => removeFavorite(property._id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
