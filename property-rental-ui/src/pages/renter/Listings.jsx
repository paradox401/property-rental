import React from 'react';
import './Listings.css';
import { propertiesimage } from '../../assets/assets';

const dummyListings = [
  {
    id: 1,
    title: 'Cozy 2BHK Apartment',
    location: 'Kathmandu, Nepal',
    rent: 12000,
    image: propertiesimage.twobhk,
  },
  {
    id: 2,
    title: 'Modern Studio Flat',
    location: 'Lalitpur, Nepal',
    rent: 9000,
    image: propertiesimage.studioflat,
  },
  {
    id: 3,
    title: 'Spacious 3BHK Apartment',
    location: 'Bhaktapur, Nepal',
    rent: 15000,
    image: propertiesimage.threebhk,
  },
];

export default function Listings() {
  return (
    <div className="listings-page">
      <h2>Available Properties</h2>
      <div className="listings-grid">
        {dummyListings.map((listing) => (
          <div className="listing-card" key={listing.id}>
            <img src={listing.image} alt={listing.title} />
            <div className="listing-info">
              <h3>{listing.title}</h3>
              <p>{listing.location}</p>
              <p>Rs. {listing.rent}/month</p>
              <button>View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
