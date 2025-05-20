import React from 'react';
import './MyBookings.css';
import { propertiesimage } from '../../assets/assets';

const dummyBookings = [
  {
    id: 1,
    title: 'Cozy 2BHK Apartment',
    location: 'Kathmandu, Nepal',
    rent: 12000,
    status: 'Confirmed',
    date: '2025-05-18',
    image: propertiesimage.twobhk
  },
  {
    id: 2,
    title: 'Modern Studio Flat',
    location: 'Lalitpur, Nepal',
    rent: 9000,
    status: 'Pending',
    date: '2025-05-20',
    image: propertiesimage.studioflat
  }
];

export default function MyBookings() {
  return (
    <div className="my-bookings">
      <h2>My Bookings</h2>
      {dummyBookings.length === 0 ? (
        <p>You have no bookings yet.</p>
      ) : (
        <div className="bookings-list">
          {dummyBookings.map((booking) => (
            <div className="booking-card" key={booking.id}>
              <img src={booking.image} alt={booking.title} />
              <div className="booking-details">
                <h3>{booking.title}</h3>
                <p>{booking.location}</p>
                <p>Rent: Rs. {booking.rent}</p>
                <p>Status: <span className={`status ${booking.status.toLowerCase()}`}>{booking.status}</span></p>
                <p>Booked on: {booking.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
