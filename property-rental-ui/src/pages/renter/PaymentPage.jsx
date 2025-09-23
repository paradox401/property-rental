import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./PaymentPage.css";

export default function PaymentPage() {
  const { user, token } = useContext(AuthContext);
  const renterId = user?._id || "";
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState("pay");
  const [khaltiLoaded, setKhaltiLoaded] = useState(false);

  // Load Khalti script dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://khalti.com/static/khalti-checkout.js";
    script.async = true;
    script.onload = () => setKhaltiLoaded(true);
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  useEffect(() => {
    if (!renterId || !token) return;

    const fetchBookings = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/bookings/approved/${renterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setBookings(data);
        else setError(data.error || "Failed to fetch bookings");
      } catch {
        setError("Server not reachable.");
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/payments/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setHistory(data);
        else setError(data.error || "Failed to fetch payment history");
      } catch {
        setError("Server not reachable.");
      }
    };

    fetchBookings();
    fetchHistory();
  }, [renterId, token]);

  const handlePayment = async (bookingId, amount) => {
    if (!user || !token) {
      setError("You must be logged in to make a payment");
      return;
    }

    if (!khaltiLoaded || !window.KhaltiCheckout) {
      setError("Khalti checkout is not loaded yet. Please refresh the page.");
      return;
    }

    try {
      const pid = `BK${bookingId}-${Date.now()}`;

      // Create payment record in backend
      const res = await fetch("http://localhost:8000/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId, amount, paymentMethod: "Khalti", pid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment initiation failed");

      // Khalti checkout
      const checkout = new window.KhaltiCheckout({
        publicKey: "test_public_key_XXXXXXXXXXXX", // Replace with your Khalti public key
        productIdentity: pid,
        productName: `Booking ${bookingId}`,
        productUrl: window.location.href,
        eventHandler: {
          onSuccess: async (payload) => {
            try {
              const verifyRes = await fetch("http://localhost:8000/api/payments/verify", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ...payload, bookingId }),
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok) setSuccessMsg("Payment successful!");
              else setError(verifyData.error || "Payment verification failed");
            } catch {
              setError("Server verification failed");
            }
          },
          onError: () => setError("Payment failed or cancelled"),
          onClose: () => console.log("Khalti widget closed"),
        },
        paymentPreference: ["KHALTI", "EBANKING", "MOBILE_BANKING", "CONNECT_IPS", "SCT"],
      });

      checkout.show({ amount: amount * 100 }); // Amount in paisa
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="payment-container">
      <h1>Payments</h1>
      <div className="tabs">
        <button className={activeTab === "pay" ? "active" : ""} onClick={() => setActiveTab("pay")}>Pay Now</button>
        <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>Payment History</button>
      </div>

      {successMsg && <p className="success-msg">{successMsg}</p>}
      {error && <p className="error-msg">{error}</p>}

      {activeTab === "pay" && (
        <div className="booking-list">
          {bookings.length === 0 ? (
            <p>No approved bookings to pay for.</p>
          ) : (
            bookings.map((b) => (
              <div key={b._id} className="booking-card">
                <h3>{b.property.title}</h3>
                <p>From: {new Date(b.fromDate).toLocaleDateString()}</p>
                <p>To: {new Date(b.toDate).toLocaleDateString()}</p>
                <p>Status: {b.status}</p>
                <p>Amount: {b.property.price} NPR</p>
                <button className="btn-pay" onClick={() => handlePayment(b._id, b.property.price)}>Pay Now</button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="history-list">
          {history.length === 0 ? <p>No payments made yet.</p> : history.map((h, idx) => (
            <div key={idx} className="history-card">
              <p>Booking ID: {h.bookingId}</p>
              <p>Amount Paid: {h.amount} NPR</p>
              <p>Date: {new Date(h.date).toLocaleString()}</p>
              <p>Status: {h.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
