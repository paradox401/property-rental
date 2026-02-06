import React, { useContext } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationList from '../components/NotificationList.jsx';
import './AdminLayout.css';

export default function AdminLayout() {
  const { user } = useContext(AuthContext);

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h2 className="logo">🏠 ForRent</h2>
        <nav>
          <NavLink to="/admin" end>Overview</NavLink>
          <NavLink to="/admin/approvals">Approvals</NavLink>
          <NavLink to="/admin/owners">Owner Verification</NavLink>
          <NavLink to="/login">Logout</NavLink>
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
