import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import './KycRequests.css';

export default function KycRequests() {
  const { token } = useContext(AuthContext);
  const [docs, setDocs] = useState([]);
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/admin/kyc-requests/pending-docs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Failed to load KYC docs');
        return;
      }
      setDocs(Array.isArray(data) ? data : []);
    } catch {
      setMessage('Failed to load KYC docs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const reviewDoc = async (userId, docId, status) => {
    const key = `${userId}:${docId}`;
    setMessage('');
    const res = await fetch(`${API_BASE_URL}/api/users/admin/kyc-requests/${userId}/documents/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        status,
        rejectReason: reasons[key] || '',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Failed to review KYC doc');
      return;
    }
    setDocs((prev) => prev.filter((doc) => !(doc.userId === userId && doc.documentId === docId)));
    setMessage(`Document ${status}.`);
  };

  if (loading) return <p className="kyc-admin-loading">Loading KYC queue...</p>;

  return (
    <div className="kyc-admin-page surface-card">
      <h2>KYC Verification Queue</h2>
      {message && <p className="kyc-admin-message">{message}</p>}
      {docs.length === 0 ? (
        <p className="kyc-admin-empty">No pending KYC documents.</p>
      ) : (
        <div className="kyc-admin-table-wrap">
          <table className="kyc-admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Doc Type</th>
              <th>Document</th>
              <th>Uploaded At</th>
              <th>Reject Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => {
              const key = `${doc.userId}:${doc.documentId}`;
              return (
                <tr key={key}>
                  <td>{doc.userName} ({doc.userEmail})</td>
                  <td>{doc.userRole}</td>
                  <td>{doc.docType || 'Government ID'}</td>
                  <td>
                    <a href={doc.imageUrl} target="_blank" rel="noreferrer" className="kyc-doc-thumb-link">
                      <img
                        src={doc.imageUrl}
                        alt={`${doc.userName} KYC`}
                        className="kyc-doc-thumb"
                      />
                    </a>
                  </td>
                  <td>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '-'}</td>
                  <td>
                    <input
                      className="kyc-reason-input"
                      value={reasons[key] || ''}
                      onChange={(e) => setReasons((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder="Reason if rejecting"
                    />
                  </td>
                  <td>
                    <div className="kyc-admin-actions">
                      <button className="btn-approve" onClick={() => reviewDoc(doc.userId, doc.documentId, 'verified')}>
                        Approve
                      </button>
                      <button className="btn-reject" onClick={() => reviewDoc(doc.userId, doc.documentId, 'rejected')}>
                        Reject
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
    </div>
  );
}
