import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import '../owner/Bookings.css';

export default function Approvals() {
  const { token } = useContext(AuthContext);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/properties/admin/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setProperties(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPending();
  }, [token]);

  const updateStatus = async (id, status) => {
    await fetch(`${API_BASE_URL}/api/properties/admin/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setProperties((prev) => prev.filter((p) => p._id !== id));
  };

  if (loading) return <p>Loading approvals...</p>;

  return (
    <div className="surface-card" style={{ padding: '2rem' }}>
      <h2>Property Approvals</h2>
      {properties.length === 0 ? (
        <p>No pending listings.</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Location</th>
              <th>Owner</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p._id}>
                <td>{p.title}</td>
                <td>{p.location}</td>
                <td>{p.ownerId?.name || p.ownerId?.email}</td>
                <td>Rs. {p.price}</td>
                <td>
                  <button className="btn-approve" onClick={() => updateStatus(p._id, 'Approved')}>
                    Approve
                  </button>
                  <button className="btn-reject" onClick={() => updateStatus(p._id, 'Rejected')}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
