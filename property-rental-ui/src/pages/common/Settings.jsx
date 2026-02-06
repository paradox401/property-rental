import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import './Settings.css';

const DEFAULT_TYPES = {
  payment: true,
  newBooking: true,
  bookingAccepted: true,
  bookingRejected: true,
  newListing: true,
  listingApproval: true,
  ownerVerification: true,
  message: true,
  review: true,
};

export default function Settings() {
  const { token } = useContext(AuthContext);
  const [prefs, setPrefs] = useState({ inApp: true, email: false, types: DEFAULT_TYPES });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchPrefs = async () => {
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPrefs({
          inApp: data.notificationPreferences?.inApp ?? true,
          email: data.notificationPreferences?.email ?? false,
          types: { ...DEFAULT_TYPES, ...(data.notificationPreferences?.types || {}) },
        });
      }
    };
    fetchPrefs();
  }, [token]);

  const toggleType = (key) => {
    setPrefs((prev) => ({
      ...prev,
      types: { ...prev.types, [key]: !prev.types[key] },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    const res = await fetch(`${API_BASE_URL}/api/users/me/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ notificationPreferences: prefs }),
    });

    if (res.ok) {
      setMessage('Preferences updated.');
    } else {
      setMessage('Failed to update preferences.');
    }
    setSaving(false);
  };

  return (
    <div className="settings-page">
      <div className="settings-card">
        <h2>Notification Preferences</h2>
        <p>Choose how you want to receive updates.</p>

        <div className="settings-group">
          <label className="toggle">
            <input
              type="checkbox"
              checked={prefs.inApp}
              onChange={() => setPrefs((prev) => ({ ...prev, inApp: !prev.inApp }))}
            />
            <span>In-app notifications</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={prefs.email}
              onChange={() => setPrefs((prev) => ({ ...prev, email: !prev.email }))}
            />
            <span>Email notifications (coming soon)</span>
          </label>
        </div>

        <h3>Types</h3>
        <div className="settings-grid">
          {Object.keys(prefs.types).map((key) => (
            <label key={key} className="checkbox">
              <input type="checkbox" checked={prefs.types[key]} onChange={() => toggleType(key)} />
              <span>{key}</span>
            </label>
          ))}
        </div>

        {message && <p className="settings-message">{message}</p>}

        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
