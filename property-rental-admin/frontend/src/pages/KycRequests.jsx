import { useEffect, useState } from 'react';
import API from '../api';

export default function KycRequests() {
  const [rows, setRows] = useState([]);
  const [reasonMap, setReasonMap] = useState({});
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await API.get('/kyc-requests');
    setRows(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    load();
  }, []);

  const reviewDoc = async (userId, docId, status) => {
    const key = `${userId}:${docId}`;
    await API.patch(`/kyc-requests/${userId}/documents/${docId}`, {
      status,
      rejectReason: reasonMap[key] || '',
    });
    setMessage(`Document ${status}.`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>KYC Requests</h1>
          <p className="page-subtitle">Verify uploaded identity documents for all users.</p>
        </div>
      </div>

      {message && <p style={{ marginBottom: '0.8rem' }}>{message}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Doc Type</th>
              <th>Document</th>
              <th>Uploaded</th>
              <th>Reject Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = `${row.userId}:${row.documentId}`;
              return (
                <tr key={key}>
                  <td>{row.userName || '-'} ({row.userEmail || '-'})</td>
                  <td>{row.userRole || '-'}</td>
                  <td>{row.docType || 'Government ID'}</td>
                  <td>
                    {row.imageUrl ? (
                      <a href={row.imageUrl} target="_blank" rel="noreferrer">
                        <img
                          src={row.imageUrl}
                          alt={`${row.userName || 'User'} KYC`}
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                        />
                      </a>
                    ) : '-'}
                  </td>
                  <td>{row.uploadedAt ? new Date(row.uploadedAt).toLocaleString() : '-'}</td>
                  <td>
                    <input
                      value={reasonMap[key] || ''}
                      onChange={(e) => setReasonMap((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder="Reason if rejecting"
                    />
                  </td>
                  <td>
                    <button className="btn" onClick={() => reviewDoc(row.userId, row.documentId, 'verified')}>
                      Approve
                    </button>{' '}
                    <button className="btn danger" onClick={() => reviewDoc(row.userId, row.documentId, 'rejected')}>
                      Reject
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan="7">No pending KYC documents.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
