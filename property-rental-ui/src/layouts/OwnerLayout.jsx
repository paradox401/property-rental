import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './OwnerLayout.css';

export default function OwnerLayout() {
  return (
    <div className="owner-layout">
      <aside className="sidebar">
        <h2 className="logo">🏠 ForRent</h2>
        <nav>
          <NavLink to="/owner" end>Dashboard</NavLink>
          <NavLink to="/owner/properties">My Properties</NavLink>
          <NavLink to="/owner/add">Add Property</NavLink>
          <NavLink to="/owner/requests">Bookings</NavLink>
          <NavLink to="/owner/messages">Messages</NavLink>
          <NavLink to="/login">Logout</NavLink>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <h3>Welcome, Owner</h3>
          <div className="user-menu">owner@test.com</div>
        </header>
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
