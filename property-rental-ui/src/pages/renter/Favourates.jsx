import React from 'react';
import './Favourates.css';
import { propertiesimage } from '../../assets/assets';

const dummyFavourites = [
  {
    id: 1,
    title: 'Luxury Villa',
    location: 'Budhanilkantha, Kathmandu',
    rent: 30000,
    image: propertiesimage.luxuryvilla,
  },
  {
    id: 2,
    title: 'Furnished Apartment',
    location: 'Jawalakhel, Lalitpur',
    rent: 18000,
    image: propertiesimage.furnishedappartment,
  },
];

export default function Favourites() {
  return (
    <div className="favourites-page">
      <h2>Your Favourites</h2>
      {dummyFavourites.length === 0 ? (
        <p>No favourite properties yet.</p>
      ) : (
        <div className="favourites-grid">
          {dummyFavourites.map((fav) => (
            <div className="favourite-card" key={fav.id}>
              <img src={fav.image} alt={fav.title} />
              <div className="favourite-info">
                <h3>{fav.title}</h3>
                <p>{fav.location}</p>
                <p>Rs. {fav.rent}/month</p>
                <button>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
