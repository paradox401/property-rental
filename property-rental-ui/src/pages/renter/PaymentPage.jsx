import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import './PaymentPage.css';

export default function PaymentPage() {
  const { user, token } = useContext(AuthContext);
  const renterId = user?._id || '';

  const [bookings, setBookings] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('pay');
  const [khaltiLoaded, setKhaltiLoaded] = useState(false);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://khalti.com/static/khalti-checkout.js';
    script.async = true;
    script.onload = () => setKhaltiLoaded(true);
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  useEffect(() => {
    if (!renterId || !token) return;

    const fetchBookings = async () => {
      setLoadingBookings(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/bookings/approved/${renterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setBookings(data);
        else setError(data.error || 'Failed to fetch bookings');
      } catch {
        setError('Server not reachable.');
      } finally {
        setLoadingBookings(false);
      }
    };

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setHistory(data);
        else setError(data.error || 'Failed to fetch payment history');
      } catch {
        setError('Server not reachable.');
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchBookings();
    fetchHistory();
  }, [renterId, token]);

  const handlePayment = async (bookingId, amount, isPaid) => {
    setError('');
    setSuccessMsg('');

    if (!user || !token) {
      setError('You must be logged in to make a payment');
      return;
    }

    if (isPaid) {
      setError('This booking is already paid.');
      return;
    }

    if (!khaltiLoaded || !window.KhaltiCheckout) {
      setError('Khalti checkout is not loaded yet. Please refresh the page.');
      return;
    }

    try {
      const pid = `BK${bookingId}-${Date.now()}`;

      const res = await fetch(`${API_BASE_URL}/api/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId, amount, paymentMethod: 'Khalti', pid }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment initiation failed');

      const checkout = new window.KhaltiCheckout({
        publicKey: 'test_public_key_9c3d3b1a4f9347e29f8d45a8b5f7b1c0',
        productIdentity: pid,
        productName: `Booking ${bookingId}`,
        productUrl: window.location.href,
        eventHandler: {
          onSuccess: async (payload) => {
            try {
              const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ...payload, bookingId, amount }),
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok) {
                setSuccessMsg('Payment successful!');
                setBookings((prev) =>
                  prev.map((b) => (b._id === bookingId ? { ...b, paymentStatus: 'paid' } : b))
                );
                setHistory((prev) => [verifyData.payment, ...prev]);
              } else setError(verifyData.error || 'Payment verification failed');
            } catch {
              setError('Server verification failed');
            }
          },
          onError: () => setError('Payment failed or cancelled'),
          onClose: () => {},
        },
        paymentPreference: ['KHALTI', 'EBANKING', 'MOBILE_BANKING', 'CONNECT_IPS', 'SCT'],
      });

      checkout.show({ amount: amount * 100 });
    } catch (err) {
      setError(err.message);
    }
  };

  const openInvoice = async (paymentId) => {
    const res = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/invoice`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setInvoice(data);
  };

  return (
    <div className="payment-container">
      <h1>Payments</h1>

      <div className="tabs">
        <button className={activeTab === 'pay' ? 'active' : ''} onClick={() => setActiveTab('pay')}>
          Pay Now
        </button>
        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          Payment History
        </button>
      </div>

      {successMsg && <p className="success-msg">{successMsg}</p>}
      {error && <p className="error-msg">{error}</p>}

      {activeTab === 'pay' && (
        <div className="booking-list">
          {loadingBookings ? (
            <p>Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <p>No approved bookings to pay for.</p>
          ) : (
            bookings.map((b) => (
              <div key={b._id} className="booking-card">
                <h3>{b.property.title}</h3>
                <p>From: {new Date(b.fromDate).toLocaleDateString()}</p>
                <p>To: {new Date(b.toDate).toLocaleDateString()}</p>
                <p>Status: {b.status}</p>
                <p>Amount: {b.property.price} NPR</p>
                <button
                  className="btn-pay"
                  disabled={b.paymentStatus === 'paid'}
                  onClick={() => handlePayment(b._id, b.property.price, b.paymentStatus === 'paid')}
                >
                  {b.paymentStatus === 'paid' ? 'Paid' : 'Pay Now'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="history-list">
          {loadingHistory ? (
            <p>Loading payment history...</p>
          ) : history.length === 0 ? (
            <p>No payments made yet.</p>
          ) : (
            history.map((h) => (
              <div key={h._id} className="history-card">
                <p>Booking: {h.booking?._id}</p>
                <p>Property: {h.booking?.property?.title || 'N/A'}</p>
                <p>Amount Paid: {h.amount} NPR</p>
                <p>Date: {new Date(h.date || h.createdAt).toLocaleString()}</p>
                <p>Status: {h.status}</p>
                <button className="btn-pay" onClick={() => openInvoice(h._id)}>
                  View Invoice
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {invoice && (
        <div className="modal-overlay" onClick={() => setInvoice(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setInvoice(null)}>
              X
            </button>
            <h3>Invoice {invoice.invoiceNumber}</h3>
            <p>Status: {invoice.status}</p>
            <p>Issued: {new Date(invoice.issuedAt).toLocaleDateString()}</p>
            <p>Property: {invoice.property?.title}</p>
            <p>Owner: {invoice.owner?.name}</p>
            <p>Amount: {invoice.amount} NPR</p>
            <p>
              Booking: {new Date(invoice.bookingPeriod?.from).toLocaleDateString()} -{' '}
              {new Date(invoice.bookingPeriod?.to).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
