import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import './Profile.css';

export default function Profile() {
  const { token, user, setUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [files, setFiles] = useState([]);
  const [passportPhotoFile, setPassportPhotoFile] = useState(null);
  const [docType, setDocType] = useState('Government ID');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadProfile = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Failed to load profile');
      return;
    }
    setProfile(data);
    setUser({ ...(user || {}), ...data });
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submitKyc = async () => {
    if (!files.length) {
      setMessage('Please select at least one document image.');
      return;
    }

    setUploading(true);
    setMessage('');
    const formData = new FormData();
    const docTypes = [];
    files.forEach((file) => {
      formData.append('kycDocs', file);
      docTypes.push(docType);
    });
    if (passportPhotoFile) {
      formData.append('kycDocs', passportPhotoFile);
      docTypes.push('Passport Size Photo');
    }
    formData.append('docTypes', JSON.stringify(docTypes));

    const res = await fetch(`${API_BASE_URL}/api/users/me/kyc-submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Failed to submit KYC');
      setUploading(false);
      return;
    }
    setMessage('KYC submitted successfully.');
    setFiles([]);
    setPassportPhotoFile(null);
    await loadProfile();
    setUploading(false);
  };

  if (!profile) return <p>Loading profile...</p>;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h2>My Profile</h2>
        <p>Name: {profile.name}</p>
        <p>Email: {profile.email}</p>
        <p>Role: {profile.role}</p>
        <p>Citizenship: {profile.citizenshipNumber}</p>
      </div>

      <div className="profile-card">
        <h3>KYC Status: {profile.kycStatus || 'unsubmitted'}</h3>
        {profile.kycStatus === 'rejected' && profile.kycRejectReason && (
          <p className="profile-error">Reject reason: {profile.kycRejectReason}</p>
        )}

        <div className="kyc-form">
          <label>Document Type</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)}>
            <option value="Driving License">Driving License</option>
            <option value="Citizenship">Citizenship</option>
            <option value="NID">NID</option>
          </select>

          <label>Upload KYC Document(s)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          {files.length > 0 && <p>{files.length} file(s) selected</p>}

          <label>Passport Size Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPassportPhotoFile(e.target.files?.[0] || null)}
          />
          {passportPhotoFile && <p>Passport photo selected: {passportPhotoFile.name}</p>}
          <button onClick={submitKyc} disabled={uploading}>
            {uploading ? 'Submitting...' : 'Submit KYC'}
          </button>
        </div>
      </div>

      <div className="profile-card">
        <h3>KYC Documents</h3>
        {Array.isArray(profile.kycDocuments) && profile.kycDocuments.length > 0 ? (
          <div className="kyc-doc-grid">
            {profile.kycDocuments.map((doc) => (
              <div className="kyc-doc-item" key={doc._id}>
                <a href={doc.imageUrl} target="_blank" rel="noreferrer">
                  <img src={doc.imageUrl} alt={doc.docType || 'KYC Doc'} />
                </a>
                <p>{doc.docType}</p>
                <span className={`kyc-chip ${String(doc.status).toLowerCase()}`}>{doc.status}</span>
                {doc.rejectReason ? <small className="profile-error">{doc.rejectReason}</small> : null}
              </div>
            ))}
          </div>
        ) : (
          <p>No KYC documents uploaded yet.</p>
        )}
      </div>

      {message && <p className="profile-message">{message}</p>}
    </div>
  );
}
