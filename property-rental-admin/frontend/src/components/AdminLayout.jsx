import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAdminSession } from '../api';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/users', label: 'Users' },
  { to: '/owner-requests', label: 'Owner Requests' },
  { to: '/properties', label: 'Properties' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/payments', label: 'Payments' },
  { to: '/complaints', label: 'Complaints' },
  { to: '/messages', label: 'Messages' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/content', label: 'Content' },
  { to: '/settings', label: 'Settings' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/reports', label: 'Reports' },
  { to: '/audit-logs', label: 'Audit Logs' },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  const logout = () => {
    clearAdminSession();
    navigate('/login');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">Property Admin</div>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
