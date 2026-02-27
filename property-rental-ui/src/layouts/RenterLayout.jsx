import React, { useContext, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import NotificationList from '../components/NotificationList.jsx';
import { AuthContext } from '../context/AuthContext';
import './RenterLayout.css';

export default function RenterLayout() {
  const { user } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`renter-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <h2 className="logo">🏠 {collapsed ? 'FR' : 'ForRent'}</h2>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <nav>
          <NavLink to="/renter" end><span className="nav-short">H</span><span className="nav-label">Home</span></NavLink>
          <NavLink to="/renter/bookings"><span className="nav-short">B</span><span className="nav-label">My Bookings</span></NavLink>
          <NavLink to="/renter/listings"><span className="nav-short">L</span><span className="nav-label">Listings</span></NavLink>
          <NavLink to="/renter/favorites"><span className="nav-short">F</span><span className="nav-label">Favourites</span></NavLink>
          <NavLink to="/renter/message"><span className="nav-short">M</span><span className="nav-label">Message</span></NavLink>
          <NavLink to="/renter/agreements"><span className="nav-short">G</span><span className="nav-label">Agreements</span></NavLink>
          <NavLink to="/renter/complaint"><span className="nav-short">C</span><span className="nav-label">Make Complaint</span></NavLink>
          <NavLink to="/renter/payments"><span className="nav-short">P</span><span className="nav-label">Payments</span></NavLink>
          <NavLink to="/renter/profile"><span className="nav-short">U</span><span className="nav-label">Profile</span></NavLink>
          <NavLink to="/renter/settings"><span className="nav-short">S</span><span className="nav-label">Settings</span></NavLink>
          <NavLink to="/login"><span className="nav-short">O</span><span className="nav-label">Logout</span></NavLink>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <h3>Welcome, {user?.name || 'Renter'}</h3>
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
