import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import '../owner/Bookings.css';

export default function OwnerVerifications() {
  const { token } = useContext(AuthContext);
  const [owners, setOwners] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [rejectReasons, setRejectReasons] = useState({});

  const fetchOwners = async () => {
    try {
      const [ownersRes, docsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/users/admin/owner-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/users/admin/owner-requests/pending-docs`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [ownersData, docsData] = await Promise.all([ownersRes.json(), docsRes.json()]);

      if (ownersRes.ok) {
        setOwners(ownersData);
      } else {
        setMessage(ownersData.error || 'Failed to load owner requests');
      }
      if (docsRes.ok) {
        setPendingDocs(docsData);
      } else {
        setMessage((prev) => prev || docsData.error || 'Failed to load pending documents');
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
      body: JSON.stringify({
        status,
        rejectReason: rejectReasons[id] || '',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Failed to update request');
      return;
    }
    setOwners((prev) => prev.filter((o) => o._id !== id));
    setPendingDocs((prev) => prev.filter((doc) => doc.ownerId !== id));
    setMessage(`Owner ${status} successfully.`);
  };

  const reviewDocument = async (ownerId, docId, status) => {
    setMessage('');
    const key = `${ownerId}:${docId}`;
    const res = await fetch(`${API_BASE_URL}/api/users/admin/owner-requests/${ownerId}/documents/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        status,
        rejectReason: rejectReasons[key] || '',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Failed to review document');
      return;
    }
    setPendingDocs((prev) => prev.filter((d) => !(d.ownerId === ownerId && d.documentId === docId)));
    setMessage(`Document ${status}.`);
    fetchOwners();
  };

  if (loading) return <p>Loading owner verification requests...</p>;

  return (
    <div className="surface-card" style={{ padding: '2rem' }}>
      <h2>Owner Verification & KYC Queue</h2>
      {message && <p style={{ marginBottom: '1rem' }}>{message}</p>}

      <h3 style={{ marginBottom: '0.75rem' }}>Pending KYC Documents ({pendingDocs.length})</h3>
      {pendingDocs.length === 0 ? (
        <p style={{ marginBottom: '1.5rem' }}>No pending documents.</p>
      ) : (
        <table className="bookings-table" style={{ marginBottom: '1.5rem' }}>
          <thead>
            <tr>
              <th>Owner</th>
              <th>Doc Type</th>
              <th>ID Photo</th>
              <th>Uploaded</th>
              <th>Reject Reason</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {pendingDocs.map((doc) => {
              const key = `${doc.ownerId}:${doc.documentId}`;
              return (
                <tr key={key}>
                  <td>{doc.ownerName} ({doc.ownerEmail})</td>
                  <td>{doc.docType || 'Government ID'}</td>
                  <td>
                    <a href={doc.imageUrl} target="_blank" rel="noreferrer">
                      <img
                        src={doc.imageUrl}
                        alt={`${doc.ownerName} ID`}
                        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                      />
                    </a>
                  </td>
                  <td>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '-'}</td>
                  <td>
                    <input
                      value={rejectReasons[key] || ''}
                      onChange={(e) =>
                        setRejectReasons((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder="Reason if rejecting"
                    />
                  </td>
                  <td>
                    <button className="btn-approve" onClick={() => reviewDocument(doc.ownerId, doc.documentId, 'verified')}>
                      Approve Doc
                    </button>
                    <button className="btn-reject" onClick={() => reviewDocument(doc.ownerId, doc.documentId, 'rejected')}>
                      Reject Doc
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h3 style={{ marginBottom: '0.75rem' }}>Owner Requests</h3>
      {owners.length === 0 ? (
        <p>No pending verification requests.</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Citizenship</th>
              <th>Reject Reason</th>
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
                  <input
                    value={rejectReasons[o._id] || ''}
                    onChange={(e) =>
                      setRejectReasons((prev) => ({ ...prev, [o._id]: e.target.value }))
                    }
                    placeholder="Reason if rejecting owner"
                  />
                </td>
                <td>
                  <button className="btn-approve" onClick={() => updateStatus(o._id, 'verified')}>
                    Verify Owner
                  </button>
                  <button className="btn-reject" onClick={() => updateStatus(o._id, 'rejected')}>
                    Reject Owner
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
