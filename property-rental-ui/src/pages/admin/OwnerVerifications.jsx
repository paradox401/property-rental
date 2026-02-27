import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import './OwnerVerifications.css';

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

  if (loading) return <p className="owner-verify-loading">Loading owner verification requests...</p>;

  return (
    <div className="owner-verify-page surface-card">
      <h2>Owner Verification & KYC Queue</h2>
      {message && <p className="owner-verify-message">{message}</p>}

      <h3 className="owner-verify-subhead">Pending KYC Documents ({pendingDocs.length})</h3>
      {pendingDocs.length === 0 ? (
        <p className="owner-verify-empty">No pending documents.</p>
      ) : (
        <div className="owner-verify-table-wrap">
          <table className="owner-verify-table">
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
                    <a href={doc.imageUrl} target="_blank" rel="noreferrer" className="owner-verify-thumb-link">
                      <img
                        src={doc.imageUrl}
                        alt={`${doc.ownerName} ID`}
                        className="owner-verify-thumb"
                      />
                    </a>
                  </td>
                  <td>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '-'}</td>
                  <td>
                    <input
                      className="owner-verify-input"
                      value={rejectReasons[key] || ''}
                      onChange={(e) =>
                        setRejectReasons((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder="Reason if rejecting"
                    />
                  </td>
                  <td>
                    <div className="owner-verify-actions">
                      <button className="btn-approve" onClick={() => reviewDocument(doc.ownerId, doc.documentId, 'verified')}>
                        Approve Doc
                      </button>
                      <button className="btn-reject" onClick={() => reviewDocument(doc.ownerId, doc.documentId, 'rejected')}>
                        Reject Doc
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      )}

      <h3 className="owner-verify-subhead">Owner Requests</h3>
      {owners.length === 0 ? (
        <p className="owner-verify-empty">No pending verification requests.</p>
      ) : (
        <div className="owner-verify-table-wrap">
          <table className="owner-verify-table">
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
                    className="owner-verify-input"
                    value={rejectReasons[o._id] || ''}
                    onChange={(e) =>
                      setRejectReasons((prev) => ({ ...prev, [o._id]: e.target.value }))
                    }
                    placeholder="Reason if rejecting owner"
                  />
                </td>
                <td>
                  <div className="owner-verify-actions">
                    <button className="btn-approve" onClick={() => updateStatus(o._id, 'verified')}>
                      Verify Owner
                    </button>
                    <button className="btn-reject" onClick={() => updateStatus(o._id, 'rejected')}>
                      Reject Owner
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
