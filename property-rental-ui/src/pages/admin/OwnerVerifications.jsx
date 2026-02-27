import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import '../owner/Bookings.css';

export default function OwnerVerifications() {
  const { token } = useContext(AuthContext);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchOwners = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/admin/owner-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setOwners(data);
      } else {
        setMessage(data.error || 'Failed to load requests');
      }
    } catch {
      setMessage('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchOwners();
  }, [token]);

  const updateStatus = async (id, status) => {
    setMessage('');
    const res = await fetch(`${API_BASE_URL}/api/users/admin/owner-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Failed to update request');
      return;
    }
    setOwners((prev) => prev.filter((o) => o._id !== id));
    setMessage(`Owner ${status} successfully.`);
  };

  if (loading) return <p>Loading owner verification requests...</p>;

  return (
    <div className="surface-card" style={{ padding: '2rem' }}>
      <h2>Owner Verification Requests</h2>
      {message && <p style={{ marginBottom: '1rem' }}>{message}</p>}
      {owners.length === 0 ? (
        <p>No pending verification requests.</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Citizenship</th>
              <th>ID Photo</th>
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
                  {o.ownerVerificationDocument?.imageUrl ? (
                    <a
                      href={o.ownerVerificationDocument.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="View uploaded ID photo"
                    >
                      <img
                        src={o.ownerVerificationDocument.imageUrl}
                        alt={`${o.name} ID`}
                        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                      />
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
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
