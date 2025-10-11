import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import protect from "../middleware/authMiddleware.js";

dotenv.config();
const router = express.Router();

// Create a new payment record
router.post("/create", protect, async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod, pid } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const payment = new Payment({
      booking: bookingId,
      renter: req.user._id,
      amount,
      paymentMethod,
      pid,
      status: "Pending",
    });

    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Verify Khalti payment
router.post("/verify", protect, async (req, res) => {
  try {
    const { token, amount, bookingId } = req.body;

    // Khalti requires amount in paisa
    const verifyRes = await axios.post(
      "https://khalti.com/api/v2/payment/verify/",
      { token, amount: amount * 100 },
      { headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}` } }
    );

    const payment = await Payment.findOne({ booking: bookingId, status: "Pending" });
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    payment.status = "Paid";
    await payment.save();

    res.json({ message: "Payment verified successfully", payment });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(400).json({ error: "Payment verification failed" });
  }
});

// Get current user's payment history
router.get("/history", protect, async (req, res) => {
  try {
    const payments = await Payment.find({ renter: req.user._id })
      .populate("booking")
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
