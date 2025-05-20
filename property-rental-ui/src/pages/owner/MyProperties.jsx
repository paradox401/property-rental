import React, { useState, useEffect } from 'react';
import './MyProperties.css';
import { propertiesimage } from '../../assets/assets';
const dummyProperties = [
  {
    id: 1,
    title: 'Cozy 2BHK Apartment',
    location: 'Kathmandu, Nepal',
    rent: 12000,
    status: 'Available',
    image: propertiesimage.twobhk,
  },
  {
    id: 2,
    title: 'Modern Studio Flat',
    location: 'Lalitpur, Nepal',
    rent: 8000,
    status: 'Rented',
    image: propertiesimage.studioflat,
  },
  {
    id: 3,
    title: 'Spacious 3BHK House',
    location: 'Bhaktapur, Nepal',
    rent: 20000,
    status: 'Available',
    image: propertiesimage.threebhk,
  },
  {
    id: 3,
    title: 'Spacious 3BHK House',
    location: 'Bhaktapur, Nepal',
    rent: 20000,
    status: 'Available',
    image: propertiesimage.threebhk,
  },
];

export default function MyProperties() {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    // Simulate fetching property data from backend
    setProperties(dummyProperties);
  }, []);

  const handleEdit = (id) => {
    alert(`Edit property with ID: ${id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this property?')) {
      setProperties(properties.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="my-properties-container">
      <h1>My Properties</h1>
      {properties.length === 0 ? (
        <p>No properties found. Please add some!</p>
      ) : (
        <div className="properties-grid">
          {properties.map((property) => (
            <div key={property.id} className="property-card">
              <img
                src={property.image}
                alt={property.title}
                className="property-image"
              />
              <div className="property-details">
                <h3>{property.title}</h3>
                <p>{property.location}</p>
                <p>
                  Rent: <span className="rent-amount">Rs. {property.rent}</span>
                </p>
                <p
                  className={
                    property.status === 'Available'
                      ? 'status-available'
                      : 'status-rented'
                  }
                >
                  {property.status}
                </p>
                <div className="property-actions">
                  <button
                    className="btn-edit"
                    onClick={() => handleEdit(property.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(property.id)}
                  >
                    Delete
                  </button>
                  <button className="btn-view">View Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
