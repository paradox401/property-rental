import React, { useState } from 'react';
import './AddProperty.css'; // create this for styling

export default function AddProperty() {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title || !location || !price || !bedrooms || !bathrooms) {
      setError('Please fill in all required fields.');
      setSuccess('');
      return;
    }

    // For now just simulate success (you can replace with API call later)
    setError('');
    setSuccess('Property added successfully!');
    // Reset form (optional)
    setTitle('');
    setLocation('');
    setPrice('');
    setBedrooms('');
    setBathrooms('');
    setDescription('');
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

        <label>Description</label>
        <textarea
          placeholder="Additional details about the property"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        ></textarea>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <button type="submit">Add Property</button>
      </form>
    </div>
  );
}
