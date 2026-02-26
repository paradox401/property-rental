import express from 'express';
import dotenv from 'dotenv';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import protect from '../middleware/authMiddleware.js';
import { sendNotification } from '../socket.js';
import User from '../models/User.js';

dotenv.config();
const router = express.Router();

const startOfMonth = (dateValue = new Date()) => {
  const date = new Date(dateValue);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfMonth = (dateValue = new Date()) => {
  const date = new Date(dateValue);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

const addMonths = (dateValue, months) => {
  const date = new Date(dateValue);
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
};

const monthDiffInclusive = (startDate, endDate) => {
  const years = endDate.getFullYear() - startDate.getFullYear();
  const months = endDate.getMonth() - startDate.getMonth();
  return years * 12 + months + 1;
};

router.post('/create', protect, async (req, res) => {
  try {
    const { bookingId, paymentMethod = 'QR', pid, transactionRef } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'Booking is required' });
    }

    const booking = await Booking.findById(bookingId).populate('property');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.renter.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (booking.status !== 'Approved') {
      return res.status(400).json({ error: 'Booking not approved yet' });
    }

    const existingPayment = await Payment.findOne({
      booking: bookingId,
      status: 'Pending',
    });
    if (existingPayment) {
      return res.status(400).json({ error: 'Payment request already submitted for this booking' });
    }

    const paidPayments = await Payment.find({
      booking: bookingId,
      status: 'Paid',
    }).sort({ paymentPeriodEnd: -1, createdAt: -1 });

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const bookingStartMonth = startOfMonth(booking.fromDate || now);

    const latestPaid = paidPayments[0];
    const latestPaidEnd = latestPaid?.paymentPeriodEnd
      ? startOfMonth(latestPaid.paymentPeriodEnd)
      : latestPaid?.createdAt
        ? startOfMonth(latestPaid.createdAt)
        : null;

    const dueStart = latestPaidEnd
      ? addMonths(latestPaidEnd, 1)
      : bookingStartMonth;

    if (dueStart > currentMonthStart) {
      return res.status(400).json({ error: 'No rent due for the current month' });
    }

    const monthsCount = monthDiffInclusive(dueStart, currentMonthStart);
    const amount = Number(booking.property?.price || 0) * monthsCount;

    const payment = new Payment({
      booking: bookingId,
      renter: req.user._id,
      amount,
      paymentMethod,
      pid,
      transactionRef,
      monthsCount,
      paymentPeriodStart: dueStart,
      paymentPeriodEnd: currentMonthEnd,
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
        '/admin'
      );
    }

    await sendNotification(
      req.user._id,
      'payment',
      `Payment request submitted for "${booking.property.title}". Waiting for admin verification.`,
      `/renter/payments`
    );

    res.status(201).json({
      message: 'Payment submitted for admin verification',
      payment,
      due: {
        from: dueStart,
        to: currentMonthEnd,
        monthsCount,
        amount,
      },
    });
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
      paymentPeriod: {
        from: payment.paymentPeriodStart || payment.createdAt,
        to: payment.paymentPeriodEnd || payment.createdAt,
        monthsCount: payment.monthsCount || 1,
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
