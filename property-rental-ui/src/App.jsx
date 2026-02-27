import React, { useContext, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { API_BASE_URL } from './config/api';

function AppPreferenceSync() {
  const { token, user, setUser } = useContext(AuthContext);

  useEffect(() => {
    const applyPrefs = (theme = 'system', compactMode = false) => {
      const root = document.documentElement;
      const resolvedTheme =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme;

      root.setAttribute('data-theme', resolvedTheme);
      root.setAttribute('data-compact', compactMode ? 'true' : 'false');
    };

    applyPrefs(user?.appPreferences?.theme || 'system', Boolean(user?.appPreferences?.compactMode));
  }, [user?.appPreferences?.theme, user?.appPreferences?.compactMode]);

  useEffect(() => {
    if (!token) return;

    const syncPrefs = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) return;
        setUser({
          ...(user || {}),
          ...data,
          appPreferences: data.appPreferences || user?.appPreferences,
          privacyPreferences: data.privacyPreferences || user?.privacyPreferences,
          notificationPreferences: data.notificationPreferences || user?.notificationPreferences,
        });
      } catch {
        // ignore preference sync errors
      }
    };

    syncPrefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return null;
}

function AppShell() {
  return (
    <SocketProvider>
      <NotificationProvider>
        <AppPreferenceSync />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </NotificationProvider>
    </SocketProvider>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
};

export default App;
