import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import protect from '../middleware/authMiddleware.js';
import { sendNotification } from '../socket.js';

dotenv.config();
const router = express.Router();

router.post('/create', protect, async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod, pid } = req.body;

    if (!bookingId || !amount || !paymentMethod || !pid) {
      return res.status(400).json({ error: 'Booking, amount, payment method, and pid are required' });
    }

    const booking = await Booking.findById(bookingId).populate('property');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.renter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (booking.status !== 'Approved') {
      return res.status(400).json({ error: 'Booking not approved yet' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Booking already paid' });
    }

    const payment = new Payment({
      booking: bookingId,
      renter: req.user._id,
      amount,
      paymentMethod,
      pid,
      status: 'Pending',
    });

    await payment.save();

    await sendNotification(
      req.user._id,
      'payment',
      `Payment initiated for "${booking.property.title}"`,
      `/renter/payments`
    );

    res.status(201).json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify', protect, async (req, res) => {
  try {
    const { token, amount, bookingId } = req.body;

    const verifyRes = await axios.post(
      'https://khalti.com/api/v2/payment/verify/',
      { token, amount: amount * 100 },
      { headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}` } }
    );

    const payment = await Payment.findOne({ booking: bookingId, status: 'Pending' });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    payment.status = 'Paid';
    await payment.save();

    await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'paid' });

    await sendNotification(
      req.user._id,
      'payment',
      `Payment verified successfully.`,
      `/renter/payments`
    );

    res.json({ message: 'Payment verified successfully', payment, verification: verifyRes.data });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(400).json({ error: 'Payment verification failed' });
  }
});

router.get('/history', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ renter: req.user._id })
      .populate({
        path: 'booking',
        populate: { path: 'property', select: 'title price ownerId' },
      })
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:paymentId/invoice', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate({
        path: 'booking',
        populate: { path: 'property', populate: { path: 'ownerId', select: 'name email' } },
      })
      .populate('renter', 'name email');

    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const booking = payment.booking;
    const ownerId = booking?.property?.ownerId?._id?.toString();

    if (
      payment.renter._id.toString() !== req.user._id.toString() &&
      ownerId !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const invoice = {
      invoiceNumber: `INV-${payment._id.toString().slice(-6).toUpperCase()}`,
      issuedAt: payment.updatedAt || payment.createdAt,
      status: payment.status,
      renter: payment.renter,
      owner: booking?.property?.ownerId,
      property: booking?.property,
      bookingPeriod: {
        from: booking?.fromDate,
        to: booking?.toDate,
      },
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
    };

    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
