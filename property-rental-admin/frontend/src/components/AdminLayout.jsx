import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import API, { clearAdminSession } from '../api';

const navGroups = [
  {
    title: 'Command',
    items: [
      { to: '/dashboard', label: 'Dashboard', short: 'DB' },
      { to: '/ops-center', label: 'Ops Center', short: 'OP' },
      { to: '/revenue-command', label: 'Revenue', short: 'RV' },
      { to: '/reports', label: 'Reports', short: 'RP' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/users', label: 'Users', short: 'US' },
      { to: '/owner-requests', label: 'Owner Requests', short: 'OR' },
      { to: '/kyc-requests', label: 'KYC Requests', short: 'KY' },
      { to: '/properties', label: 'Properties', short: 'PR' },
      { to: '/bookings', label: 'Bookings', short: 'BK' },
      { to: '/payments', label: 'Payments', short: 'PY' },
      { to: '/visits', label: 'Visits', short: 'VI' },
    ],
  },
  {
    title: 'Support',
    items: [
      { to: '/complaints', label: 'Complaints', short: 'CP' },
      { to: '/messages', label: 'Messages', short: 'MS' },
      { to: '/reviews', label: 'Reviews', short: 'RW' },
      { to: '/notifications', label: 'Notifications', short: 'NT' },
      { to: '/admin-notes', label: 'Admin Notes', short: 'AN' },
    ],
  },
  {
    title: 'Governance',
    items: [
      { to: '/content', label: 'Content', short: 'CT' },
      { to: '/settings', label: 'Settings', short: 'ST' },
      { to: '/rule-engine', label: 'Rule Engine', short: 'RL' },
      { to: '/export-center', label: 'Export Center', short: 'EX' },
      { to: '/duplicate-hub', label: 'Duplicate Hub', short: 'DH' },
      { to: '/access-control', label: 'Access Control', short: 'AC' },
      { to: '/audit-logs', label: 'Audit Logs', short: 'AL' },
    ],
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('adminTheme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });
  const [incident, setIncident] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('adminTheme', theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;
    const loadIncident = async () => {
      try {
        const res = await API.get('/ops/incidents');
        if (!mounted) return;
        const list = Array.isArray(res.data?.incidents) ? res.data.incidents : [];
        setIncident(list[0] || null);
      } catch {
        if (mounted) setIncident(null);
      }
    };
    loadIncident();
    const timer = setInterval(loadIncident, 60_000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const logout = () => {
    clearAdminSession();
    navigate('/login');
  };

  const activeItem = useMemo(() => {
    const items = navGroups.flatMap((group) => group.items);
    return items
      .slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
  }, [location.pathname]);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className={`admin-shell ${navOpen ? 'nav-open' : ''}`}>
      <button
        type="button"
        className="admin-nav-backdrop"
        onClick={() => setNavOpen(false)}
        aria-label="Close admin navigation"
      />
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">DN</span>
          <span>
            <strong>DeraNow</strong>
            <small>Admin Control</small>
          </span>
        </div>
        <nav className="admin-nav">
          {navGroups.map((group) => (
            <section className="admin-nav-group" key={group.title}>
              <p>{group.title}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="admin-nav-short">{item.short}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </section>
          ))}
        </nav>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </aside>

      <main className="admin-main">
        {incident ? (
          <div className={`incident-banner ${incident.severity || 'medium'}`}>
            <strong>{incident.title || 'Incident'}</strong>
            <span>{incident.message || incident.detail}</span>
          </div>
        ) : null}
        <div className="admin-main-topbar">
          <button
            type="button"
            className="admin-menu-btn"
            onClick={() => setNavOpen((prev) => !prev)}
            aria-label="Open admin navigation"
          >
            Menu
          </button>
          <div className="admin-current-section">
            <span>Workspace</span>
            <strong>{activeItem?.label || 'Dashboard'}</strong>
          </div>
          <button
            className={`theme-toggle ${theme}`}
            type="button"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            aria-label="Toggle dark mode"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span className="theme-toggle-track">
              <span className="theme-toggle-thumb" />
            </span>
            <span className="theme-toggle-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
