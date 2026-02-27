import React, { useContext, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './OwnerLayout.css';
import { AuthContext } from '../context/AuthContext';
import NotificationList from '../components/NotificationList.jsx';
export default function OwnerLayout() {
  const { user } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`owner-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
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
          <NavLink to="/owner" end><span className="nav-short">D</span><span className="nav-label">Dashboard</span></NavLink>
          <NavLink to="/owner/properties"><span className="nav-short">P</span><span className="nav-label">My Properties</span></NavLink>
          <NavLink to="/owner/add"><span className="nav-short">A</span><span className="nav-label">Add Property</span></NavLink>
          <NavLink to="/owner/requests"><span className="nav-short">B</span><span className="nav-label">Bookings</span></NavLink>
          <NavLink to="/owner/messages"><span className="nav-short">M</span><span className="nav-label">Messages</span></NavLink>
          <NavLink to="/owner/agreements"><span className="nav-short">G</span><span className="nav-label">Agreements</span></NavLink>
          <NavLink to="/owner/documents"><span className="nav-short">D</span><span className="nav-label">Documents</span></NavLink>
          <NavLink to="/owner/ocomplaint"><span className="nav-short">C</span><span className="nav-label">Complaints</span></NavLink>
          <NavLink to="/owner/payment-status"><span className="nav-short">R</span><span className="nav-label">Rent Status</span></NavLink>
          <NavLink to="/owner/profile"><span className="nav-short">U</span><span className="nav-label">Profile</span></NavLink>
          <NavLink to="/owner/settings"><span className="nav-short">S</span><span className="nav-label">Settings</span></NavLink>
          <NavLink to="/login"><span className="nav-short">O</span><span className="nav-label">Logout</span></NavLink>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          {user && (
            <>
              <h3>Welcome, {user.name || 'Owner'}</h3>
              <div className="user-menu">{user.email}</div>
              <NotificationList />
            </>
          )}
        </header>
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
