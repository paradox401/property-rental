import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './RenterLayout.css';

export default function RenterLayout() {
  return (
    <div className="renter-layout">
      <aside className="sidebar">
        <h2 className="logo">🏠 ForRent</h2>
        <nav>
          <NavLink to="/renter" end>Home</NavLink>
          <NavLink to="/renter/bookings">My Bookings</NavLink>
          <NavLink to="/renter/listings">Listings</NavLink>
          <NavLink to="/renter/favorites">favourites</NavLink>
          <NavLink to="/renter/message">Message</NavLink>
          <NavLink to="/login">Logout</NavLink>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <h3>Welcome, Renter</h3>
          <div className="user-menu">renter@test.com</div>
        </header>
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
