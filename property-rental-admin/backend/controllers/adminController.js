import User from '../models/User.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import Complaint from '../models/Complaint.js';
import Payment from '../models/Payment.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import AdminSetting from '../models/AdminSetting.js';
import AuditLog from '../models/AuditLog.js';

const safeRegex = (value) => new RegExp(String(value || '').trim(), 'i');
const parsePage = (value, fallback = 1) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback;
};
const parseLimit = (value, fallback = 20) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(Math.floor(num), 100);
};
const sendPaginated = (res, items, total, page, limit) => {
  res.json({
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
};

const logAudit = async (req, action, entityType, entityId, details = null) => {
  try {
    await AuditLog.create({
      adminId: req.admin?._id,
      action,
      entityType,
      entityId: String(entityId),
      details,
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};

export const getOverview = async (_req, res) => {
  try {
    const [users, properties, bookings, complaints, payments, messages] = await Promise.all([
      User.countDocuments(),
      Property.countDocuments(),
      Booking.countDocuments(),
      Complaint.countDocuments(),
      Payment.countDocuments(),
      Message.countDocuments(),
    ]);

    const [pendingListings, pendingOwnerVerifications, openComplaints, failedPayments] = await Promise.all([
      Property.countDocuments({ status: 'Pending' }),
      User.countDocuments({ ownerVerificationStatus: 'pending' }),
      Complaint.countDocuments({ status: { $ne: 'resolved' } }),
      Payment.countDocuments({ status: 'Failed' }),
    ]);

    const paymentAgg = await Payment.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
    ]);

    const recentActivity = await AuditLog.find().sort({ createdAt: -1 }).limit(15);

    res.json({
      totals: {
        users,
        properties,
        bookings,
        complaints,
        payments,
        messages,
        revenue: paymentAgg[0]?.totalRevenue || 0,
      },
      alerts: {
        pendingListings,
        pendingOwnerVerifications,
        openComplaints,
        failedPayments,
      },
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { q, role, active, page, limit } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { name: safeRegex(q) },
        { email: safeRegex(q) },
        { citizenshipNumber: safeRegex(q) },
      ];
    }

    if (role) filter.role = role;
    if (active !== undefined) filter.isActive = active === 'true';

    const currentPage = parsePage(page);
    const currentLimit = parseLimit(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit),
      User.countDocuments(filter),
    ]);
    sendPaginated(res, users, total, currentPage, currentLimit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(isActive) },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    await logAudit(req, 'user_status_changed', 'User', user._id, { isActive: user.isActive });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

export const getOwnerRequests = async (req, res) => {
  try {
    const currentPage = parsePage(req.query.page);
    const currentLimit = parseLimit(req.query.limit);
    const filter = { role: 'owner', ownerVerificationStatus: 'pending' };
    const [requests, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit),
      User.countDocuments(filter),
    ]);
    sendPaginated(res, requests, total, currentPage, currentLimit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch owner verification requests' });
  }
};

export const updateOwnerRequest = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const owner = await User.findByIdAndUpdate(
      req.params.id,
      {
        ownerVerificationStatus: status,
        ownerVerifiedAt: status === 'verified' ? new Date() : null,
      },
      { new: true }
    );

    if (!owner) return res.status(404).json({ error: 'Owner not found' });

    await logAudit(req, 'owner_verification_updated', 'User', owner._id, { status });
    res.json(owner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update owner request' });
  }
};

export const getAllProperties = async (req, res) => {
  try {
    const { q, status, page, limit } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { title: safeRegex(q) },
        { location: safeRegex(q) },
        { description: safeRegex(q) },
      ];
    }
    if (status) filter.status = status;

    const currentPage = parsePage(page);
    const currentLimit = parseLimit(limit);
    const [properties, total] = await Promise.all([
      Property.find(filter)
        .populate('ownerId', 'name email ownerVerificationStatus')
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit),
      Property.countDocuments(filter),
    ]);

    sendPaginated(res, properties, total, currentPage, currentLimit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
};

export const updatePropertyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid property status' });
    }

    const property = await Property.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    await logAudit(req, 'property_status_changed', 'Property', property._id, { status });
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update property status' });
  }
};

export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    await logAudit(req, 'property_deleted', 'Property', property._id);
    res.json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete property' });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const filter = status ? { status } : {};
    const currentPage = parsePage(page);
    const currentLimit = parseLimit(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate({
          path: 'property',
          populate: { path: 'ownerId', select: 'name email' },
        })
        .populate('renter', 'name email')
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit),
      Booking.countDocuments(filter),
    ]);

    sendPaginated(res, bookings, total, currentPage, currentLimit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status' });
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    await logAudit(req, 'booking_status_changed', 'Booking', booking._id, { status });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking status' });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const { status, payoutStatus, page, limit } = req.query;
    const filter = status ? { status } : {};
    if (payoutStatus) filter.payoutStatus = payoutStatus;
    const currentPage = parsePage(page);
    const currentLimit = parseLimit(limit);
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('renter', 'name email')
        .populate({
          path: 'booking',
          populate: { path: 'property', select: 'title location ownerId', populate: { path: 'ownerId', select: 'name email' } },
        })
        .populate('ownerId', 'name email')
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit),
      Payment.countDocuments(filter),
    ]);

    sendPaginated(res, payments, total, currentPage, currentLimit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { status, adminRemark } = req.body;
    if (!['Pending', 'Paid', 'Failed', 'Refunded'].includes(status)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status, ...(adminRemark ? { adminRemark } : {}) },
      { new: true }
    );
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (payment.booking) {
      if (status === 'Paid') {
        await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'paid' });
      } else if (status === 'Failed' || status === 'Pending') {
        await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'pending' });
        await Payment.findByIdAndUpdate(payment._id, {
          payoutStatus: 'Unallocated',
          commissionPercent: 0,
          commissionAmount: 0,
          ownerAmount: 0,
          payoutAllocatedAt: null,
          payoutTransferredAt: null,
        });
      }
    }

    await logAudit(req, 'payment_status_changed', 'Payment', payment._id, { status });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payment status' });
  }
};

export const allocateOwnerPayout = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate({
      path: 'booking',
      populate: { path: 'property', select: 'title ownerId' },
    });

    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'Paid') {
      return res.status(400).json({ error: 'Only paid payments can be allocated to owner' });
    }

    const ownerId = payment.booking?.property?.ownerId;
    if (!ownerId) {
      return res.status(400).json({ error: 'Owner not found for booking property' });
    }

    const commissionSetting = await AdminSetting.findOne({ key: 'platformCommissionPct' });
    const defaultCommission = Number(commissionSetting?.value);
    const incomingCommission = Number(req.body?.commissionPercent);
    const commissionPercent = Number.isFinite(incomingCommission)
      ? incomingCommission
      : Number.isFinite(defaultCommission)
        ? defaultCommission
        : 10;

    if (commissionPercent < 0 || commissionPercent > 100) {
      return res.status(400).json({ error: 'Commission percent must be between 0 and 100' });
    }

    const commissionAmount = Number(((payment.amount * commissionPercent) / 100).toFixed(2));
    const ownerAmount = Number((payment.amount - commissionAmount).toFixed(2));

    payment.ownerId = ownerId;
    payment.commissionPercent = commissionPercent;
    payment.commissionAmount = commissionAmount;
    payment.ownerAmount = ownerAmount;
    payment.payoutStatus = 'Allocated';
    payment.payoutAllocatedAt = new Date();
    payment.payoutTransferredAt = null;
    payment.payoutNote = req.body?.payoutNote || payment.payoutNote;
    await payment.save();

    await logAudit(req, 'owner_payout_allocated', 'Payment', payment._id, {
      ownerId,
      commissionPercent,
      commissionAmount,
      ownerAmount,
    });

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to allocate owner payout' });
  }
};

export const markOwnerPayoutTransferred = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'Paid') {
      return res.status(400).json({ error: 'Only paid payments can be transferred' });
    }
    if (payment.payoutStatus !== 'Allocated' && payment.payoutStatus !== 'Transferred') {
      return res.status(400).json({ error: 'Allocate payout before marking as transferred' });
    }

    payment.payoutStatus = 'Transferred';
    payment.payoutTransferredAt = new Date();
    payment.payoutNote = req.body?.payoutNote || payment.payoutNote;
    await payment.save();

    await logAudit(req, 'owner_payout_transferred', 'Payment', payment._id, {
      ownerId: payment.ownerId,
      ownerAmount: payment.ownerAmount,
    });

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark owner payout transferred' });
  }
};

export const getAllComplaints = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const filter = status ? { status } : {};
    const currentPage = parsePage(page);
    const currentLimit = parseLimit(limit);
    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit),
      Complaint.countDocuments(filter),
    ]);
    sendPaginated(res, complaints, total, currentPage, currentLimit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid complaint status' });
    }

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    await logAudit(req, 'complaint_status_changed', 'Complaint', complaint._id, { status });
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update complaint status' });
  }
};

export const getAllMessages = async (req, res) => {
  try {
    const currentPage = parsePage(req.query.page);
    const currentLimit = parseLimit(req.query.limit, 50);
    const [messages, total] = await Promise.all([
      Message.find()
        .populate('sender', 'name email')
        .populate('receiver', 'name email')
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit),
      Message.countDocuments(),
    ]);
    sendPaginated(res, messages, total, currentPage, currentLimit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const getAllReviews = async (req, res) => {
  try {
    const currentPage = parsePage(req.query.page);
    const currentLimit = parseLimit(req.query.limit, 30);
    const properties = await Property.find({ 'reviews.0': { $exists: true } })
      .select('title location reviews')
      .populate('reviews.user', 'name email');

    const reviewRows = properties.flatMap((property) =>
      (property.reviews || []).map((review, index) => ({
        reviewId: `${property._id}:${index}`,
        propertyId: property._id,
        propertyTitle: property.title,
        location: property.location,
        user: review.user,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      }))
    );

    const sortedRows = reviewRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const start = (currentPage - 1) * currentLimit;
    const paginatedRows = sortedRows.slice(start, start + currentLimit);
    sendPaginated(res, paginatedRows, sortedRows.length, currentPage, currentLimit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { propertyId, reviewId } = req.params;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const [pid, indexRaw] = String(reviewId).split(':');
    if (String(pid) !== String(propertyId)) return res.status(400).json({ error: 'Invalid review id' });

    const index = Number(indexRaw);
    if (Number.isNaN(index) || index < 0 || index >= property.reviews.length) {
      return res.status(404).json({ error: 'Review not found' });
    }

    property.reviews.splice(index, 1);
    await property.save();

    await logAudit(req, 'review_deleted', 'PropertyReview', reviewId, { propertyId });
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

export const getSettings = async (_req, res) => {
  try {
    const settings = await AdminSetting.find().sort({ key: 1 });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const upsertSettings = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates must be an array' });

    await Promise.all(
      updates.map((item) =>
        AdminSetting.findOneAndUpdate(
          { key: item.key },
          { key: item.key, value: item.value },
          { new: true, upsert: true }
        )
      )
    );

    await logAudit(req, 'settings_updated', 'AdminSetting', 'bulk', { count: updates.length });
    const settings = await AdminSetting.find().sort({ key: 1 });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const getFeaturedListings = async (_req, res) => {
  try {
    const settings = await AdminSetting.findOne({ key: 'featuredListingIds' });
    const ids = settings?.value || [];
    if (!Array.isArray(ids) || ids.length === 0) return res.json([]);

    const properties = await Property.find({ _id: { $in: ids } });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch featured listings' });
  }
};

export const updateFeaturedListings = async (req, res) => {
  try {
    const { propertyIds } = req.body;
    if (!Array.isArray(propertyIds)) {
      return res.status(400).json({ error: 'propertyIds must be an array' });
    }

    const setting = await AdminSetting.findOneAndUpdate(
      { key: 'featuredListingIds' },
      { value: propertyIds },
      { upsert: true, new: true }
    );

    await logAudit(req, 'featured_listings_updated', 'AdminSetting', setting._id, { count: propertyIds.length });
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update featured listings' });
  }
};

export const sendBroadcast = async (req, res) => {
  try {
    const { message, type = 'announcement', role } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const filter = role ? { role } : {};
    const users = await User.find(filter).select('_id');

    const docs = users.map((u) => ({
      userId: u._id,
      type,
      message,
      link: '/notifications',
    }));

    if (docs.length) await Notification.insertMany(docs);

    await logAudit(req, 'broadcast_sent', 'Notification', 'bulk', { recipients: docs.length, role: role || 'all' });
    res.json({ message: 'Broadcast sent', recipients: docs.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
};

export const getReports = async (_req, res) => {
  try {
    const [propertyByStatus, bookingByStatus, paymentByStatus, complaintByStatus] = await Promise.all([
      Property.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    res.json({ propertyByStatus, bookingByStatus, paymentByStatus, complaintByStatus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const currentPage = parsePage(req.query.page);
    const currentLimit = parseLimit(req.query.limit, 50);
    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate('adminId', 'username')
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit),
      AuditLog.countDocuments(),
    ]);
    sendPaginated(res, logs, total, currentPage, currentLimit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};
