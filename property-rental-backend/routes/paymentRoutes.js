import express from 'express';
import dotenv from 'dotenv';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import protect from '../middleware/authMiddleware.js';
import { sendNotification } from '../socket.js';
import User from '../models/User.js';

dotenv.config();
const router = express.Router();

router.post('/create', protect, async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod = 'QR', pid, transactionRef } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'Booking and amount are required' });
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

    const existingPayment = await Payment.findOne({
      booking: bookingId,
      status: { $in: ['Pending', 'Paid'] },
    });
    if (existingPayment) {
      return res.status(400).json({ error: 'Payment request already submitted for this booking' });
    }

    const payment = new Payment({
      booking: bookingId,
      renter: req.user._id,
      amount,
      paymentMethod,
      pid,
      transactionRef,
      status: 'Pending',
    });

    await payment.save();
    await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'pending_verification' });

    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await sendNotification(
        admin._id,
        'payment',
        `Payment verification requested for "${booking.property.title}"`,
        '/admin/payments'
      );
    }

    await sendNotification(
      req.user._id,
      'payment',
      `Payment request submitted for "${booking.property.title}". Waiting for admin verification.`,
      `/renter/payments`
    );

    res.status(201).json({ message: 'Payment submitted for admin verification', payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify', protect, async (req, res) => {
  return res.status(410).json({ error: 'Khalti verification disabled. Use admin manual verification flow.' });
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
