import React, { useContext, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationList from '../components/NotificationList.jsx';
import './AdminLayout.css';

export default function AdminLayout() {
  const { user } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
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
          <NavLink to="/admin" end><span className="nav-short">O</span><span className="nav-label">Overview</span></NavLink>
          <NavLink to="/admin/approvals"><span className="nav-short">A</span><span className="nav-label">Approvals</span></NavLink>
          <NavLink to="/admin/owners"><span className="nav-short">V</span><span className="nav-label">Owner Verification</span></NavLink>
          <NavLink to="/admin/kyc"><span className="nav-short">K</span><span className="nav-label">KYC Queue</span></NavLink>
          <NavLink to="/admin/profile"><span className="nav-short">U</span><span className="nav-label">Profile</span></NavLink>
          <NavLink to="/login"><span className="nav-short">L</span><span className="nav-label">Logout</span></NavLink>
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          {user && (
            <>
              <h3>Welcome, {user.name || 'Admin'}</h3>
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
