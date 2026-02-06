import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import '../owner/Bookings.css';

export default function OwnerVerifications() {
  const { token } = useContext(AuthContext);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOwners = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/admin/owner-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setOwners(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchOwners();
  }, [token]);

  const updateStatus = async (id, status) => {
    await fetch(`${API_BASE_URL}/api/users/admin/owner-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setOwners((prev) => prev.filter((o) => o._id !== id));
  };

  if (loading) return <p>Loading owner verification requests...</p>;

  return (
    <div className="surface-card" style={{ padding: '2rem' }}>
      <h2>Owner Verification Requests</h2>
      {owners.length === 0 ? (
        <p>No pending verification requests.</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Citizenship</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((o) => (
              <tr key={o._id}>
                <td>{o.name}</td>
                <td>{o.email}</td>
                <td>{o.citizenshipNumber}</td>
                <td>
                  <button className="btn-approve" onClick={() => updateStatus(o._id, 'verified')}>
                    Verify
                  </button>
                  <button className="btn-reject" onClick={() => updateStatus(o._id, 'rejected')}>
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
