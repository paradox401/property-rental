import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import './PaymentStatus.css';

export default function PaymentStatus() {
  const { token } = useContext(AuthContext);
  const [data, setData] = useState({
    summary: {
      totalApprovedBookings: 0,
      paidByRenter: 0,
      pendingFromRenter: 0,
      transferredToOwner: 0,
    },
    rows: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOwnerPaymentStatus = async () => {
      if (!token) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/owner/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to fetch payment status');
        setData({
          summary: payload.summary || data.summary,
          rows: Array.isArray(payload.rows) ? payload.rows : [],
        });
      } catch (err) {
        setError(err.message || 'Failed to fetch payment status');
      } finally {
        setLoading(false);
      }
    };
    fetchOwnerPaymentStatus();
  }, [token]);

  if (loading) return <p>Loading payment status...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="owner-payment-page">
      <div className="owner-payment-header">
        <h2>Rent & Payout Status</h2>
        <p>Track renter payment and whether admin has transferred your payout.</p>
      </div>

      <div className="owner-payment-cards">
        <div className="owner-payment-card">
          <h3>{data.summary.totalApprovedBookings}</h3>
          <p>Active Rentals</p>
        </div>
        <div className="owner-payment-card">
          <h3>{data.summary.paidByRenter}</h3>
          <p>Paid by Renter</p>
        </div>
        <div className="owner-payment-card">
          <h3>{data.summary.pendingFromRenter}</h3>
          <p>Pending from Renter</p>
        </div>
        <div className="owner-payment-card">
          <h3>{data.summary.transferredToOwner}</h3>
          <p>Transferred to You</p>
        </div>
      </div>

      <div className="owner-payment-table-wrap">
        <table className="owner-payment-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Renter</th>
              <th>Monthly Rent</th>
              <th>Booking From</th>
              <th>Renter Payment</th>
              <th>Admin Payout</th>
              <th>Net to Owner</th>
              <th>Last Payment</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.bookingId}>
                <td>{row.propertyTitle}</td>
                <td>
                  <div>{row.renterName}</div>
                  <small>{row.renterEmail}</small>
                </td>
                <td>Rs. {row.monthlyRent}</td>
                <td>{row.bookingFrom ? new Date(row.bookingFrom).toLocaleDateString() : '-'}</td>
                <td>
                  <span className={`owner-chip ${String(row.renterPaymentStatus).toLowerCase().replace(/\s+/g, '-')}`}>
                    {row.renterPaymentStatus}
                  </span>
                </td>
                <td>
                  <span className={`owner-chip ${String(row.ownerPayoutStatus).toLowerCase()}`}>
                    {row.ownerPayoutStatus}
                  </span>
                </td>
                <td>Rs. {row.ownerAmount || 0}</td>
                <td>
                  {row.latestPaymentAmount
                    ? `Rs. ${row.latestPaymentAmount} (${new Date(row.latestPaymentAt).toLocaleDateString()})`
                    : '-'}
                </td>
              </tr>
            ))}
            {data.rows.length === 0 && (
              <tr>
                <td colSpan="8">No approved rentals found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
