import { useEffect, useState } from 'react';
import API from '../api';

const defaults = {
  platformFeePercent: '0',
  bookingExpiryHours: '24',
  maxListingsPerOwner: '100',
  allowInstantBooking: 'true',
};

export default function Settings() {
  const [settings, setSettings] = useState(defaults);

  useEffect(() => {
    API.get('/settings').then((res) => {
      const next = { ...defaults };
      res.data.forEach((item) => {
        next[item.key] = String(item.value);
      });
      setSettings(next);
    });
  }, []);

  const save = async () => {
    const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));
    await API.put('/settings', { updates });
    alert('Settings saved');
  };

  return (
    <div>
      <div className="page-header"><div><h1>System Settings</h1><p className="page-subtitle">Control booking rules, fees, and platform limits.</p></div></div>
      <div className="card">
        <div className="toolbar" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          <label>Platform Fee (%)<input value={settings.platformFeePercent} onChange={(e) => setSettings((p) => ({ ...p, platformFeePercent: e.target.value }))} /></label>
          <label>Booking Expiry (hours)<input value={settings.bookingExpiryHours} onChange={(e) => setSettings((p) => ({ ...p, bookingExpiryHours: e.target.value }))} /></label>
          <label>Max Listings / Owner<input value={settings.maxListingsPerOwner} onChange={(e) => setSettings((p) => ({ ...p, maxListingsPerOwner: e.target.value }))} /></label>
          <label>Allow Instant Booking
            <select value={settings.allowInstantBooking} onChange={(e) => setSettings((p) => ({ ...p, allowInstantBooking: e.target.value }))}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        </div>
        <button className="btn" onClick={save}>Save Settings</button>
      </div>
    </div>
  );
}
