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

  // Fetch approved bookings and payment history
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
      } catch (err) {
        setError("Server not reachable. Try again later.");
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
      } catch (err) {
        console.error("Payment history fetch error:", err);
        setError("Server not reachable. Try again later.");
      }
    };


    fetchBookings();
    fetchHistory();
  }, [renterId, token]);

  // Handle eSewa payment
  const handlePayment = async (bookingId, amount) => {
    if (!user || !token) {
      setError("You must be logged in to make a payment");
      return;
    }

    try {
      const pid = `BK${bookingId}-${Date.now()}`;
      const merchantCode = "EPAYTEST"; // Sandbox Merchant Code

      // Create payment record in backend (Pending)
      const res = await fetch("http://localhost:8000/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId, amount, paymentMethod: "eSewa", pid }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment initiation failed");

      // Redirect to eSewa payment page
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://esewa.com.np/epay/main";
      form.target = "_blank";

      const params = {
        amt: amount,
        psc: 0,
        pdc: 0,
        tAmt: amount,
        pid: pid,
        scd: merchantCode,
        su: `https://e6c8ea8332b0.ngrok-free.app/renter/payment/success?bookingId=${bookingId}&pid=${pid}&amount=${amount}`,
        fu: `https://e6c8ea8332b0.ngrok-free.app/renter/payment/failure?bookingId=${bookingId}&pid=${pid}&amount=${amount}`,

      };

      for (let key in params) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = params[key];
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="payment-container">
      <h1>Payments</h1>

      <div className="tabs">
        <button
          className={activeTab === "pay" ? "active" : ""}
          onClick={() => setActiveTab("pay")}
        >
          Pay Now
        </button>
        <button
          className={activeTab === "history" ? "active" : ""}
          onClick={() => setActiveTab("history")}
        >
          Payment History
        </button>
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
                <button
                  className="btn-pay"
                  onClick={() => handlePayment(b._id, b.property.price)}
                >
                  Pay Now
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="history-list">
          {history.length === 0 ? (
            <p>No payments made yet.</p>
          ) : (
            history.map((h, idx) => (
              <div key={idx} className="history-card">
                <p>Booking ID: {h.bookingId}</p>
                <p>Amount Paid: {h.amount} NPR</p>
                <p>Date: {new Date(h.date).toLocaleString()}</p>
                <p>Status: {h.status}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
