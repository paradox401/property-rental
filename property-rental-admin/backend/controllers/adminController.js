import User from '../models/User.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import Complaint from '../models/Complaint.js';
import Payment from '../models/Payment.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import AdminSetting from '../models/AdminSetting.js';
import AuditLog from '../models/AuditLog.js';
import Agreement from '../models/Agreement.js';

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

const toMonthKey = (value) => {
  const date = new Date(value);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
};

const parseDateInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toCsvValue = (value) => {
  const normalized =
    value == null
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

const buildActionableReminders = async () => {
  const reminders = [];
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const [approvedBookings, agreements, payoutsPendingTransfer] = await Promise.all([
    Booking.find({ status: 'Approved', createdAt: { $lte: threeDaysAgo } })
      .select('_id createdAt fromDate toDate')
      .lean(),
    Agreement.find().select('booking currentVersion versions').lean(),
    Payment.countDocuments({
      status: 'Paid',
      payoutStatus: { $ne: 'Transferred' },
      createdAt: { $lte: threeDaysAgo },
    }),
  ]);

  const signedAgreementBookingIds = new Set(
    agreements
      .filter((agreement) => {
        const versions = Array.isArray(agreement.versions) ? agreement.versions : [];
        const active =
          versions.find((item) => Number(item.version) === Number(agreement.currentVersion)) ||
          versions[versions.length - 1];
        return active?.status === 'fully_signed';
      })
      .map((agreement) => String(agreement.booking))
  );

  const unsignedBookingCount = approvedBookings.filter(
    (booking) => !signedAgreementBookingIds.has(String(booking._id))
  ).length;

  if (unsignedBookingCount > 0) {
    reminders.push({
      code: 'agreement_unsigned_over_3_days',
      title: 'Booking approved but agreement unsigned (3+ days)',
      count: unsignedBookingCount,
      severity: 'warning',
    });
  }

  if (payoutsPendingTransfer > 0) {
    reminders.push({
      code: 'paid_not_transferred',
      title: 'Payment paid but owner payout not transferred',
      count: payoutsPendingTransfer,
      severity: 'warning',
    });
  }

  return reminders;
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
    const activityDays = Math.max(1, Math.min(Number(_req.query?.activityDays || 30), 365));
    const activitySince = new Date(Date.now() - activityDays * 24 * 60 * 60 * 1000);

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
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalOwnerDistributed: {
            $sum: {
              $cond: [
                { $eq: ['$payoutStatus', 'Transferred'] },
                { $ifNull: ['$ownerAmount', 0] },
                0,
              ],
            },
          },
        },
      },
    ]);

    const totalRevenue = paymentAgg[0]?.totalRevenue || 0;
    const ownerDistributed = paymentAgg[0]?.totalOwnerDistributed || 0;
    const profit = Number((totalRevenue - ownerDistributed).toFixed(2));

    const payoutSummary = await Payment.aggregate([
      {
        $match: {
          status: 'Paid',
        },
      },
      {
        $group: {
          _id: null,
          allocated: {
            $sum: {
              $cond: [{ $eq: ['$payoutStatus', 'Allocated'] }, { $ifNull: ['$ownerAmount', 0] }, 0],
            },
          },
          transferred: {
            $sum: {
              $cond: [{ $eq: ['$payoutStatus', 'Transferred'] }, { $ifNull: ['$ownerAmount', 0] }, 0],
            },
          },
          pendingTransfer: {
            $sum: {
              $cond: [
                { $in: ['$payoutStatus', ['Unallocated', 'Allocated']] },
                { $ifNull: ['$ownerAmount', 0] },
                0,
              ],
            },
          },
        },
      },
    ]);

    const payoutTrendRows = await Payment.aggregate([
      { $match: { status: 'Paid' } },
      {
        $project: {
          month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          ownerAmount: { $ifNull: ['$ownerAmount', 0] },
          payoutStatus: '$payoutStatus',
        },
      },
      {
        $group: {
          _id: '$month',
          allocated: {
            $sum: {
              $cond: [{ $eq: ['$payoutStatus', 'Allocated'] }, '$ownerAmount', 0],
            },
          },
          transferred: {
            $sum: {
              $cond: [{ $eq: ['$payoutStatus', 'Transferred'] }, '$ownerAmount', 0],
            },
          },
          pendingTransfer: {
            $sum: {
              $cond: [{ $in: ['$payoutStatus', ['Unallocated', 'Allocated']] }, '$ownerAmount', 0],
            },
          },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 6 },
      { $sort: { _id: 1 } },
    ]);

    const [recentActivity, actionableReminders] = await Promise.all([
      AuditLog.find({ createdAt: { $gte: activitySince } }).sort({ createdAt: -1 }).limit(15),
      buildActionableReminders(),
    ]);

    res.json({
      totals: {
        users,
        properties,
        bookings,
        complaints,
        payments,
        messages,
        revenue: totalRevenue,
        ownerDistributed,
        profit,
      },
      alerts: {
        pendingListings,
        pendingOwnerVerifications,
        openComplaints,
        failedPayments,
        actionableReminders,
        activityDays,
      },
      payoutSummary: {
        allocated: payoutSummary[0]?.allocated || 0,
        transferred: payoutSummary[0]?.transferred || 0,
        pendingTransfer: payoutSummary[0]?.pendingTransfer || 0,
        trend: payoutTrendRows.map((row) => ({
          month: row._id,
          allocated: row.allocated || 0,
          transferred: row.transferred || 0,
          pendingTransfer: row.pendingTransfer || 0,
        })),
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

export const getKycRequests = async (_req, res) => {
  try {
    const users = await User.find({ 'kycDocuments.0': { $exists: true } })
      .select('name email role kycStatus kycRejectReason kycDocuments')
      .sort({ updatedAt: -1 });

    const queue = users.flatMap((user) =>
      (user.kycDocuments || [])
        .map((doc) => ({
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          kycStatus: user.kycStatus || 'pending',
          kycRejectReason: user.kycRejectReason || '',
          documentId: doc._id,
          docType: doc.docType || 'Government ID',
          docStatus: doc.status || 'pending',
          imageUrl: doc.imageUrl,
          uploadedAt: doc.uploadedAt || doc.createdAt,
        }))
    );

    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KYC requests' });
  }
};

export const reviewKycDocument = async (req, res) => {
  try {
    const { status, rejectReason = '' } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const docs = Array.isArray(user.kycDocuments) ? user.kycDocuments : [];
    const doc = docs.id ? docs.id(req.params.docId) : docs.find((d) => String(d._id) === String(req.params.docId));
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    doc.status = status;
    doc.rejectReason = status === 'rejected' ? String(rejectReason || 'Document rejected') : '';
    doc.reviewedAt = new Date();

    const pendingCount = docs.filter((d) => d.status === 'pending').length;
    const rejectedCount = docs.filter((d) => d.status === 'rejected').length;

    if (pendingCount === 0 && rejectedCount === 0) {
      user.kycStatus = 'verified';
      user.kycVerifiedAt = new Date();
      user.kycRejectReason = '';
    } else if (status === 'rejected') {
      user.kycStatus = 'rejected';
      user.kycRejectReason = doc.rejectReason;
    } else if (user.kycStatus !== 'verified') {
      user.kycStatus = 'pending';
    }

    user.markModified('kycDocuments');
    await user.save();
    await logAudit(req, 'kyc_document_reviewed', 'User', user._id, {
      documentId: req.params.docId,
      status,
      rejectReason: doc.rejectReason || '',
    });

    res.json({ message: 'KYC document reviewed', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to review KYC document' });
  }
};

export const reviewKycRequest = async (req, res) => {
  try {
    const { status, rejectReason = '' } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const docs = Array.isArray(user.kycDocuments) ? user.kycDocuments : [];
    const pendingDocs = docs.filter((d) => d.status === 'pending');
    if (pendingDocs.length === 0) {
      return res.status(400).json({ error: 'No pending KYC docs for this user' });
    }

    docs.forEach((doc) => {
      if (doc.status !== 'pending') return;
      doc.status = status;
      doc.rejectReason = status === 'rejected' ? String(rejectReason || 'KYC rejected') : '';
      doc.reviewedAt = new Date();
    });

    user.kycStatus = status;
    user.kycVerifiedAt = status === 'verified' ? new Date() : null;
    user.kycRejectReason = status === 'rejected' ? String(rejectReason || 'KYC rejected') : '';

    user.markModified('kycDocuments');
    await user.save();
    await logAudit(req, 'kyc_request_reviewed', 'User', user._id, {
      status,
      rejectReason: user.kycRejectReason || '',
      reviewedDocs: pendingDocs.length,
    });

    res.json({ message: 'KYC request reviewed', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to review KYC request' });
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
        .populate('recipient', 'name email')
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
    const {
      page,
      limit,
      q,
      entityType,
      action,
      adminId,
      dateFrom,
      dateTo,
      export: exportFormat,
    } = req.query;

    const filter = {};
    if (q) {
      const regex = safeRegex(q);
      filter.$or = [{ action: regex }, { entityType: regex }, { entityId: regex }];
    }
    if (entityType) filter.entityType = entityType;
    if (action) filter.action = action;
    if (adminId) filter.adminId = adminId;

    const from = parseDateInput(dateFrom);
    const to = parseDateInput(dateTo);
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }

    const query = AuditLog.find(filter)
      .populate('adminId', 'username')
      .sort({ createdAt: -1 });

    if (String(exportFormat || '').toLowerCase() === 'csv') {
      const rows = await query.limit(5000).lean();
      const header = ['time', 'admin', 'action', 'entityType', 'entityId', 'details'];
      const csvRows = rows.map((row) =>
        [
          row.createdAt,
          row.adminId?.username || '',
          row.action,
          row.entityType,
          row.entityId,
          row.details,
        ]
          .map(toCsvValue)
          .join(',')
      );
      const csv = [header.join(','), ...csvRows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      return res.status(200).send(csv);
    }

    const currentPage = parsePage(req.query.page);
    const currentLimit = parseLimit(req.query.limit, 50);
    const [logs, total] = await Promise.all([
      query
        .skip((currentPage - 1) * currentLimit)
        .limit(currentLimit),
      AuditLog.countDocuments(filter),
    ]);
    sendPaginated(res, logs, total, currentPage, currentLimit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

export const getDashboardViews = async (req, res) => {
  try {
    const key = `dashboardViews:${req.admin._id}`;
    const setting = await AdminSetting.findOne({ key }).lean();
    const views = Array.isArray(setting?.value) ? setting.value : [];
    res.json({ views });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard views' });
  }
};

export const saveDashboardView = async (req, res) => {
  try {
    const { id, name, filters = {}, layout = {} } = req.body || {};
    const trimmedName = String(name || '').trim();
    if (!trimmedName) return res.status(400).json({ error: 'View name is required' });

    const key = `dashboardViews:${req.admin._id}`;
    const setting = await AdminSetting.findOne({ key });
    const current = Array.isArray(setting?.value) ? setting.value : [];
    const nextId = id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nextView = {
      id: nextId,
      name: trimmedName,
      filters,
      layout,
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = current.findIndex((item) => item.id === nextId);
    if (existingIndex >= 0) current[existingIndex] = nextView;
    else current.unshift(nextView);

    const saved = await AdminSetting.findOneAndUpdate(
      { key },
      { key, value: current.slice(0, 20) },
      { upsert: true, new: true }
    );

    await logAudit(req, 'dashboard_view_saved', 'AdminSetting', saved._id, {
      viewId: nextId,
      name: trimmedName,
    });
    res.json({ views: saved.value || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save dashboard view' });
  }
};

export const deleteDashboardView = async (req, res) => {
  try {
    const viewId = String(req.params.id || '').trim();
    if (!viewId) return res.status(400).json({ error: 'View id is required' });

    const key = `dashboardViews:${req.admin._id}`;
    const setting = await AdminSetting.findOne({ key });
    const current = Array.isArray(setting?.value) ? setting.value : [];
    const filtered = current.filter((item) => item.id !== viewId);

    const saved = await AdminSetting.findOneAndUpdate(
      { key },
      { key, value: filtered },
      { upsert: true, new: true }
    );

    await logAudit(req, 'dashboard_view_deleted', 'AdminSetting', saved._id, { viewId });
    res.json({ views: saved.value || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete dashboard view' });
  }
};
