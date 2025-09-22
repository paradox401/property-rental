// PaymentFailure.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PaymentFailure() {
  const navigate = useNavigate();

  useEffect(() => {
    alert("Payment failed or canceled.");
    navigate("/payments");
  }, [navigate]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Payment failed!</h2>
      <p>Please try again.</p>
    </div>
  );
}
