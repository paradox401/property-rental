import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './AddProperty.css';

export default function AddProperty() {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Apartment');
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, token } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title || !location || !price || !bedrooms || !bathrooms || !type) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
           Authorization: `Bearer ${token}`, 
        },
        body: JSON.stringify({
          title,
          location,
          price: Number(price),
          bedrooms: Number(bedrooms),
          bathrooms: Number(bathrooms),
          description,
          type,
          image,
          
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to add property.');
      } else {
        setSuccess('Property added successfully!');
        // Reset form
        setTitle('');
        setLocation('');
        setPrice('');
        setBedrooms('');
        setBathrooms('');
        setDescription('');
        setType('Apartment');
        setImage('');
      }
    } catch (err) {
      setError('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-property-container">
      <h2>Add New Property</h2>
      <form onSubmit={handleSubmit} className="add-property-form">
        <label>Title *</label>
        <input
          type="text"
          placeholder="Property title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label>Location *</label>
        <input
          type="text"
          placeholder="Property location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <label>Price (per month) *</label>
        <input
          type="number"
          placeholder="e.g. 15000"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <label>Bedrooms *</label>
        <input
          type="number"
          placeholder="Number of bedrooms"
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
        />

        <label>Bathrooms *</label>
        <input
          type="number"
          placeholder="Number of bathrooms"
          value={bathrooms}
          onChange={(e) => setBathrooms(e.target.value)}
        />

        <label>Type *</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="Apartment">Apartment</option>
          <option value="House">House</option>
          <option value="Condo">Condo</option>
        </select>

        <label>Description</label>
        <textarea
          placeholder="Additional details about the property"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        ></textarea>

        <label>Image URL</label>
        <input
          type="text"
          placeholder="http://example.com/image.jpg"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Property'}
        </button>
      </form>
    </div>
  );
}
