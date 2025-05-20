import React from 'react';
import './Home.css';

export default function Home() {
  return (
    <div className="renter-home">
      <h1>Welcome to ForRent</h1>
      <p>Your one-stop solution to discover and book rental properties easily.</p>

      <div className="home-cards">
        <div className="home-card">
          <h3>Browse Properties</h3>
          <p>Explore various properties based on your preference and budget.</p>
        </div>
        <div className="home-card">
          <h3>Manage Bookings</h3>
          <p>View and manage all your active and past rental bookings.</p>
        </div>
        <div className="home-card">
          <h3>Personal Settings</h3>
          <p>Update your profile and manage your rental preferences.</p>
        </div>
      </div>
    </div>
  );
}
