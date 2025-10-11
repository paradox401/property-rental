import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import NotificationList from '../components/NotificationList.jsx';
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
          <NavLink to="/renter/favorites">Favourites</NavLink>
          <NavLink to="/renter/message">Message</NavLink>
          <NavLink to="/renter/complaint">Make Complaint</NavLink>
          <NavLink to="/renter/payments">Payments</NavLink>
          <NavLink to="/login">Logout</NavLink>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <h3>Welcome, Renter</h3>
          <div className="user-menu">
            <NotificationList />
          </div>
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
