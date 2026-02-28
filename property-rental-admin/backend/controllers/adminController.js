import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import Complaint from '../models/Complaint.js';
import Payment from '../models/Payment.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import AdminSetting from '../models/AdminSetting.js';
import AuditLog from '../models/AuditLog.js';
import Agreement from '../models/Agreement.js';
import AdminAnnotation from '../models/AdminAnnotation.js';
import LeaseAmendment from '../models/LeaseAmendment.js';
import DepositLedgerEntry from '../models/DepositLedgerEntry.js';
import { calcMoMChangePct, calcOccupancyRate, calcProfit } from '../utils/kpiMath.js';

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

const startOfMonth = (value = new Date()) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfMonth = (value = new Date()) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

const addMonths = (value, months) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
};

const findOverlappingApprovedBooking = async ({ propertyId, fromDate, toDate, excludeBookingId = null }) => {
  const filter = {
    property: propertyId,
    status: 'Approved',
    fromDate: { $lte: toDate },
    toDate: { $gte: fromDate },
  };
  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }
  return Booking.findOne(filter).select('_id fromDate toDate renter').lean();
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
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

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
    const profit = calcProfit(totalRevenue, ownerDistributed);

    const [
      activeBookingRentRows,
      approvedPropertyCount,
      occupiedPropertyRows,
      paidCurrentMonthAgg,
      transferredOwnerCurrentMonthAgg,
    ] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            status: 'Approved',
            fromDate: { $lte: now },
            toDate: { $gte: now },
          },
        },
        {
          $lookup: {
            from: 'properties',
            localField: 'property',
            foreignField: '_id',
            as: 'property',
          },
        },
        { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
        { $project: { monthlyRent: { $ifNull: ['$property.price', 0] }, propertyId: '$property._id' } },
      ]),
      Property.countDocuments({ status: 'Approved' }),
      Booking.aggregate([
        {
          $match: {
            status: 'Approved',
            fromDate: { $lte: now },
            toDate: { $gte: now },
          },
        },
        { $group: { _id: '$property' } },
      ]),
      Payment.aggregate([
        { $match: { status: 'Paid', createdAt: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, amount: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            status: 'Paid',
            payoutStatus: 'Transferred',
            createdAt: { $gte: monthStart, $lte: monthEnd },
          },
        },
        { $group: { _id: null, ownerAmount: { $sum: { $ifNull: ['$ownerAmount', 0] } } } },
      ]),
    ]);

    const liveMRR = activeBookingRentRows.reduce(
      (sum, row) => sum + Number(row.monthlyRent || 0),
      0
    );
    const realizedMRR = Number(paidCurrentMonthAgg[0]?.amount || 0);
    const ownerDistributedCurrentMonth = Number(transferredOwnerCurrentMonthAgg[0]?.ownerAmount || 0);
    const platformProfitCurrentMonth = calcProfit(realizedMRR, ownerDistributedCurrentMonth);
    const occupiedProperties = occupiedPropertyRows.length;
    const occupancyRate = calcOccupancyRate(occupiedProperties, approvedPropertyCount);

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
      kpis: {
        formulas: {
          liveMRR:
            'Sum of monthly rent (property.price) for active approved bookings where fromDate <= today <= toDate.',
          realizedMRR:
            'Sum of paid payment amount for current month (Payment.status = Paid within current month).',
          occupancyRate:
            'Occupied approved properties / total approved properties * 100, where occupied means at least one active approved booking.',
          platformProfit:
            'Realized MRR for current month - owner amount transferred in current month.',
        },
        values: {
          liveMRR: Number(liveMRR.toFixed(2)),
          realizedMRR: Number(realizedMRR.toFixed(2)),
          occupancyRate,
          approvedProperties: approvedPropertyCount,
          occupiedProperties,
          platformProfit: platformProfitCurrentMonth,
          ownerDistributedCurrentMonth: Number(ownerDistributedCurrentMonth.toFixed(2)),
        },
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

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (status === 'Approved') {
      const overlap = await findOverlappingApprovedBooking({
        propertyId: booking.property,
        fromDate: booking.fromDate,
        toDate: booking.toDate,
        excludeBookingId: booking._id,
      });
      if (overlap) {
        return res.status(409).json({
          error: 'Cannot approve booking due to overlap with an existing approved booking',
        });
      }
    }

    booking.status = status;
    booking.acceptedAt = status === 'Approved' ? new Date() : null;
    booking.rejectedAt = status === 'Rejected' ? new Date() : null;
    await booking.save();

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

export const getRevenueCommandCenter = async (_req, res) => {
  try {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = addMonths(currentMonthStart, -1);
    const previousThreeMonthStart = addMonths(currentMonthStart, -3);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const oneDayMs = 24 * 60 * 60 * 1000;

    const [
      activeBookingRows,
      paidThisMonthAgg,
      paidPreviousMonthAgg,
      pendingPayoutRows,
      paymentStatuses7d,
      monthlyRevenueRows,
      churnRiskRows,
      unsignedAgreements,
    ] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            status: 'Approved',
            fromDate: { $lte: now },
            toDate: { $gte: now },
          },
        },
        {
          $lookup: {
            from: 'properties',
            localField: 'property',
            foreignField: '_id',
            as: 'property',
          },
        },
        { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            monthlyRent: { $ifNull: ['$property.price', 0] },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { status: 'Paid', createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
        { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'Paid', createdAt: { $gte: previousMonthStart, $lt: currentMonthStart } } },
        { $group: { _id: null, amount: { $sum: '$amount' } } },
      ]),
      Payment.find({
        status: 'Paid',
        payoutStatus: { $ne: 'Transferred' },
      })
        .select('ownerAmount payoutAllocatedAt createdAt payoutStatus booking')
        .populate({
          path: 'booking',
          populate: { path: 'property', select: 'title' },
        })
        .lean(),
      Payment.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'Paid', createdAt: { $gte: previousThreeMonthStart, $lte: currentMonthEnd } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Booking.find({
        status: 'Approved',
        toDate: { $gte: now, $lte: next30Days },
      })
        .select('_id toDate paymentStatus createdAt property renter')
        .populate('property', 'title')
        .populate('renter', 'name email')
        .lean(),
      Agreement.find().select('booking currentVersion versions').lean(),
    ]);

    const liveMRR = activeBookingRows.reduce((sum, row) => sum + Number(row.monthlyRent || 0), 0);
    const realizedMRR = Number(paidThisMonthAgg[0]?.amount || 0);
    const paidTxnThisMonth = Number(paidThisMonthAgg[0]?.count || 0);
    const previousMonthRevenue = Number(paidPreviousMonthAgg[0]?.amount || 0);
    const momChangePct = calcMoMChangePct(realizedMRR, previousMonthRevenue);

    const payoutAgingBuckets = {
      '0-3d': { count: 0, amount: 0 },
      '4-7d': { count: 0, amount: 0 },
      '8-14d': { count: 0, amount: 0 },
      '15+d': { count: 0, amount: 0 },
    };
    let totalPendingPayout = 0;
    let oldestPendingPayoutDays = 0;

    pendingPayoutRows.forEach((row) => {
      const amount = Number(row.ownerAmount || 0);
      const anchor = row.payoutAllocatedAt || row.createdAt;
      const ageDays = Math.max(0, Math.floor((now - new Date(anchor)) / oneDayMs));
      oldestPendingPayoutDays = Math.max(oldestPendingPayoutDays, ageDays);
      totalPendingPayout += amount;

      if (ageDays <= 3) {
        payoutAgingBuckets['0-3d'].count += 1;
        payoutAgingBuckets['0-3d'].amount += amount;
      } else if (ageDays <= 7) {
        payoutAgingBuckets['4-7d'].count += 1;
        payoutAgingBuckets['4-7d'].amount += amount;
      } else if (ageDays <= 14) {
        payoutAgingBuckets['8-14d'].count += 1;
        payoutAgingBuckets['8-14d'].amount += amount;
      } else {
        payoutAgingBuckets['15+d'].count += 1;
        payoutAgingBuckets['15+d'].amount += amount;
      }
    });

    const statusCountMap = new Map(paymentStatuses7d.map((row) => [row._id, row.count]));
    const paidCount7d = Number(statusCountMap.get('Paid') || 0);
    const failedCount7d = Number(statusCountMap.get('Failed') || 0);
    const pendingCount7d = Number(statusCountMap.get('Pending') || 0);
    const totalCount7d = paidCount7d + failedCount7d + pendingCount7d;
    const failedRate7d = totalCount7d ? Number(((failedCount7d / totalCount7d) * 100).toFixed(2)) : 0;

    const recentUnsignedAgreementCount = (() => {
      const signedBookingIds = new Set(
        unsignedAgreements
          .filter((agreement) => {
            const versions = Array.isArray(agreement.versions) ? agreement.versions : [];
            const active =
              versions.find((item) => Number(item.version) === Number(agreement.currentVersion)) ||
              versions[versions.length - 1];
            return active?.status === 'fully_signed';
          })
          .map((agreement) => String(agreement.booking))
      );

      return churnRiskRows.filter(
        (booking) =>
          new Date(booking.createdAt) <= threeDaysAgo &&
          !signedBookingIds.has(String(booking._id))
      ).length;
    })();

    const churnRisk = churnRiskRows
      .map((booking) => {
        const daysToEnd = Math.max(0, Math.ceil((new Date(booking.toDate) - now) / oneDayMs));
        const paymentPending = String(booking.paymentStatus || 'pending').toLowerCase() !== 'paid';
        const score = Math.min(
          100,
          (daysToEnd <= 7 ? 45 : daysToEnd <= 14 ? 30 : 20) +
            (paymentPending ? 35 : 0) +
            (new Date(booking.createdAt) <= fourteenDaysAgo ? 20 : 8)
        );
        return {
          bookingId: booking._id,
          property: booking.property?.title || 'Unknown property',
          renter: booking.renter?.name || booking.renter?.email || 'Unknown renter',
          toDate: booking.toDate,
          paymentStatus: booking.paymentStatus || 'pending',
          daysToEnd,
          score,
          tier: score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low',
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    const anomalies = [];
    if (failedRate7d >= 20 && totalCount7d >= 8) {
      anomalies.push({
        code: 'payment_fail_rate_spike',
        severity: 'high',
        title: 'Payment failure spike in last 7 days',
        detail: `${failedRate7d}% failure rate (${failedCount7d}/${totalCount7d} transactions)`,
      });
    }
    if (oldestPendingPayoutDays > 7) {
      anomalies.push({
        code: 'payout_delay',
        severity: oldestPendingPayoutDays > 14 ? 'high' : 'medium',
        title: 'Owner payout delays detected',
        detail: `Oldest pending payout is ${oldestPendingPayoutDays} day(s) old`,
      });
    }
    if (momChangePct <= -25 && previousMonthRevenue > 0) {
      anomalies.push({
        code: 'revenue_drop',
        severity: 'medium',
        title: 'Month-over-month revenue drop',
        detail: `Revenue is down ${Math.abs(momChangePct)}% versus last month`,
      });
    }
    if (recentUnsignedAgreementCount > 0) {
      anomalies.push({
        code: 'unsigned_agreements',
        severity: 'medium',
        title: 'Approved bookings with unsigned agreements',
        detail: `${recentUnsignedAgreementCount} booking(s) need agreement completion`,
      });
    }

    res.json({
      headline: {
        liveMRR: Number(liveMRR.toFixed(2)),
        realizedMRR: Number(realizedMRR.toFixed(2)),
        paidTransactionsThisMonth: paidTxnThisMonth,
        pendingPayoutTotal: Number(totalPendingPayout.toFixed(2)),
        monthOverMonthChangePct: momChangePct,
      },
      payoutAging: {
        buckets: Object.entries(payoutAgingBuckets).map(([bucket, value]) => ({
          bucket,
          count: value.count,
          amount: Number(value.amount.toFixed(2)),
        })),
        oldestPendingDays: oldestPendingPayoutDays,
      },
      churnRisk: {
        atRiskCount: churnRisk.length,
        highRiskCount: churnRisk.filter((item) => item.tier === 'high').length,
        items: churnRisk,
      },
      anomalies,
      trend: monthlyRevenueRows.map((row) => ({
        month: row._id,
        revenue: Number(row.amount || 0),
        paidTransactions: Number(row.count || 0),
      })),
      paymentHealth7d: {
        paid: paidCount7d,
        failed: failedCount7d,
        pending: pendingCount7d,
        failedRatePct: failedRate7d,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch revenue command center' });
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

export const getOpsInbox = async (_req, res) => {
  try {
    const [pendingProperties, pendingOwners, pendingKycUsers, pendingComplaints, pendingPayoutPayments, unsignedAgreements] =
      await Promise.all([
        Property.find({ status: 'Pending' }).select('_id title location createdAt').sort({ createdAt: 1 }).limit(30).lean(),
        User.find({ role: 'owner', ownerVerificationStatus: 'pending' }).select('_id name email createdAt').sort({ createdAt: 1 }).limit(30).lean(),
        User.find({ kycStatus: 'pending' }).select('_id name email role updatedAt').sort({ updatedAt: 1 }).limit(30).lean(),
        Complaint.find({ status: { $ne: 'resolved' } }).select('_id subject status createdAt').sort({ createdAt: 1 }).limit(30).lean(),
        Payment.find({ status: 'Paid', payoutStatus: { $ne: 'Transferred' } })
          .select('_id amount ownerAmount payoutStatus createdAt booking')
          .populate({ path: 'booking', populate: { path: 'property', select: 'title' } })
          .sort({ createdAt: 1 })
          .limit(30)
          .lean(),
        Agreement.find().select('_id booking property currentVersion versions updatedAt').populate('property', 'title').limit(80).lean(),
      ]);

    const unsignedAgreementItems = unsignedAgreements
      .filter((agreement) => {
        const versions = Array.isArray(agreement.versions) ? agreement.versions : [];
        const active =
          versions.find((item) => Number(item.version) === Number(agreement.currentVersion)) ||
          versions[versions.length - 1];
        return active?.status !== 'fully_signed';
      })
      .slice(0, 30)
      .map((agreement) => ({
        id: agreement._id,
        property: agreement.property?.title || 'Unknown property',
        status: 'agreement_unsigned',
        createdAt: agreement.updatedAt,
      }));

    const inbox = [
      ...pendingProperties.map((item) => ({
        id: item._id,
        type: 'property_pending',
        title: item.title,
        subtitle: item.location || '',
        createdAt: item.createdAt,
        entityType: 'Property',
        entityId: String(item._id),
      })),
      ...pendingOwners.map((item) => ({
        id: item._id,
        type: 'owner_verification_pending',
        title: item.name || item.email,
        subtitle: item.email || '',
        createdAt: item.createdAt,
        entityType: 'User',
        entityId: String(item._id),
      })),
      ...pendingKycUsers.map((item) => ({
        id: item._id,
        type: 'kyc_pending',
        title: item.name || item.email,
        subtitle: `${item.role} • ${item.email || ''}`,
        createdAt: item.updatedAt,
        entityType: 'User',
        entityId: String(item._id),
      })),
      ...pendingComplaints.map((item) => ({
        id: item._id,
        type: 'complaint_open',
        title: item.subject || 'Complaint',
        subtitle: item.status || 'pending',
        createdAt: item.createdAt,
        entityType: 'Complaint',
        entityId: String(item._id),
      })),
      ...pendingPayoutPayments.map((item) => ({
        id: item._id,
        type: 'payout_pending_transfer',
        title: item.booking?.property?.title || 'Payment',
        subtitle: `Owner amount Rs. ${item.ownerAmount || 0}`,
        createdAt: item.createdAt,
        entityType: 'Payment',
        entityId: String(item._id),
      })),
      ...unsignedAgreementItems.map((item) => ({
        id: item.id,
        type: item.status,
        title: item.property,
        subtitle: 'Agreement needs signatures',
        createdAt: item.createdAt,
        entityType: 'Agreement',
        entityId: String(item.id),
      })),
    ]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 120);

    res.json({
      summary: {
        total: inbox.length,
        propertyPending: pendingProperties.length,
        ownerVerificationPending: pendingOwners.length,
        kycPending: pendingKycUsers.length,
        complaintOpen: pendingComplaints.length,
        payoutPending: pendingPayoutPayments.length,
        unsignedAgreements: unsignedAgreementItems.length,
      },
      items: inbox,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflow inbox' });
  }
};

export const runBulkAction = async (req, res) => {
  try {
    const { action, ids = [], payload = {} } = req.body || {};
    const normalizedIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!action || !normalizedIds.length) return res.status(400).json({ error: 'Action and ids are required' });

    let modified = 0;
    if (action === 'properties_approve') {
      const result = await Property.updateMany({ _id: { $in: normalizedIds } }, { $set: { status: 'Approved' } });
      modified = result.modifiedCount || 0;
    } else if (action === 'properties_reject') {
      const result = await Property.updateMany({ _id: { $in: normalizedIds } }, { $set: { status: 'Rejected' } });
      modified = result.modifiedCount || 0;
    } else if (action === 'bookings_approve') {
      const result = await Booking.updateMany({ _id: { $in: normalizedIds } }, { $set: { status: 'Approved' } });
      modified = result.modifiedCount || 0;
    } else if (action === 'bookings_reject') {
      const result = await Booking.updateMany({ _id: { $in: normalizedIds } }, { $set: { status: 'Rejected' } });
      modified = result.modifiedCount || 0;
    } else if (action === 'complaints_resolve') {
      const result = await Complaint.updateMany({ _id: { $in: normalizedIds } }, { $set: { status: 'resolved' } });
      modified = result.modifiedCount || 0;
    } else if (action === 'payments_mark_transferred') {
      const result = await Payment.updateMany(
        { _id: { $in: normalizedIds }, status: 'Paid' },
        {
          $set: {
            payoutStatus: 'Transferred',
            payoutTransferredAt: new Date(),
            ...(payload.payoutNote ? { payoutNote: String(payload.payoutNote) } : {}),
          },
        }
      );
      modified = result.modifiedCount || 0;
    } else {
      return res.status(400).json({ error: 'Unsupported bulk action' });
    }

    await logAudit(req, 'bulk_action_executed', 'BulkAction', action, {
      ids: normalizedIds.slice(0, 200),
      action,
      modified,
    });

    res.json({ success: true, action, modified, requested: normalizedIds.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to run bulk action' });
  }
};

export const getSlaDashboard = async (_req, res) => {
  try {
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const [pendingPropertyRows, pendingOwnerRows, openComplaintRows, pendingPayoutRows] = await Promise.all([
      Property.find({ status: 'Pending' }).select('_id createdAt').lean(),
      User.find({ role: 'owner', ownerVerificationStatus: 'pending' }).select('_id createdAt').lean(),
      Complaint.find({ status: { $ne: 'resolved' } }).select('_id createdAt').lean(),
      Payment.find({ status: 'Paid', payoutStatus: { $ne: 'Transferred' } }).select('_id createdAt payoutAllocatedAt').lean(),
    ]);

    const bucketize = (items, createdAtResolver) => {
      const buckets = { '0-1d': 0, '2-3d': 0, '4-7d': 0, '8+d': 0 };
      items.forEach((item) => {
        const base = createdAtResolver(item);
        const age = Math.max(0, Math.floor((now - new Date(base)) / oneDayMs));
        if (age <= 1) buckets['0-1d'] += 1;
        else if (age <= 3) buckets['2-3d'] += 1;
        else if (age <= 7) buckets['4-7d'] += 1;
        else buckets['8+d'] += 1;
      });
      return buckets;
    };

    res.json({
      listings: bucketize(pendingPropertyRows, (item) => item.createdAt),
      ownerVerification: bucketize(pendingOwnerRows, (item) => item.createdAt),
      complaints: bucketize(openComplaintRows, (item) => item.createdAt),
      payouts: bucketize(pendingPayoutRows, (item) => item.payoutAllocatedAt || item.createdAt),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SLA dashboard' });
  }
};

export const getIncidentBanner = async (_req, res) => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [failed7d, total7d, delayedPayout, unsignedCount] = await Promise.all([
      Payment.countDocuments({ status: 'Failed', createdAt: { $gte: sevenDaysAgo } }),
      Payment.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Payment.countDocuments({ status: 'Paid', payoutStatus: { $ne: 'Transferred' }, createdAt: { $lte: threeDaysAgo } }),
      (async () => {
        const [approved, agreements] = await Promise.all([
          Booking.find({ status: 'Approved', createdAt: { $lte: threeDaysAgo } }).select('_id').lean(),
          Agreement.find().select('booking currentVersion versions').lean(),
        ]);
        const signed = new Set(
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
        return approved.filter((item) => !signed.has(String(item._id))).length;
      })(),
    ]);

    const failedRate = total7d ? Number(((failed7d / total7d) * 100).toFixed(2)) : 0;
    const incidents = [];
    if (failedRate >= 20 && total7d >= 8) {
      incidents.push({ code: 'payment_fail_spike', severity: 'high', message: `Payment failure rate ${failedRate}% in last 7 days.` });
    }
    if (delayedPayout > 0) {
      incidents.push({ code: 'payout_delay', severity: delayedPayout > 10 ? 'high' : 'medium', message: `${delayedPayout} paid payments waiting payout transfer.` });
    }
    if (unsignedCount > 0) {
      incidents.push({ code: 'agreement_unsigned', severity: 'medium', message: `${unsignedCount} approved bookings still unsigned after 3+ days.` });
    }
    res.json({ incidents, hasIncident: incidents.length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
};

export const getReconciliation = async (_req, res) => {
  try {
    const [bookings, payments, agreements] = await Promise.all([
      Booking.find().select('_id status paymentStatus').lean(),
      Payment.find().select('_id booking status payoutStatus ownerAmount amount').lean(),
      Agreement.find().select('_id booking currentVersion versions').lean(),
    ]);

    const paymentByBooking = new Map();
    payments.forEach((payment) => {
      const key = String(payment.booking);
      const current = paymentByBooking.get(key);
      if (!current || new Date(payment.createdAt || 0) > new Date(current.createdAt || 0)) {
        paymentByBooking.set(key, payment);
      }
    });
    const agreementByBooking = new Map(agreements.map((agreement) => [String(agreement.booking), agreement]));

    const issues = [];
    for (const booking of bookings) {
      const key = String(booking._id);
      const payment = paymentByBooking.get(key);
      const agreement = agreementByBooking.get(key);
      const versions = Array.isArray(agreement?.versions) ? agreement.versions : [];
      const active =
        versions.find((item) => Number(item.version) === Number(agreement?.currentVersion)) ||
        versions[versions.length - 1];
      const signed = active?.status === 'fully_signed';

      if (booking.status === 'Approved' && !signed) {
        issues.push({
          type: 'agreement_missing_signature',
          bookingId: booking._id,
          message: 'Approved booking without fully signed agreement',
          severity: 'medium',
        });
      }
      if (booking.status === 'Approved' && payment?.status === 'Paid' && payment.payoutStatus === 'Unallocated') {
        issues.push({
          type: 'payout_unallocated',
          bookingId: booking._id,
          paymentId: payment._id,
          message: 'Paid booking payment has not been allocated for payout',
          severity: 'high',
        });
      }
      if (booking.paymentStatus === 'paid' && (!payment || payment.status !== 'Paid')) {
        issues.push({
          type: 'booking_payment_mismatch',
          bookingId: booking._id,
          message: 'Booking payment status is paid but payment record is missing or not paid',
          severity: 'high',
        });
      }
    }

    res.json({
      totalIssues: issues.length,
      high: issues.filter((item) => item.severity === 'high').length,
      medium: issues.filter((item) => item.severity === 'medium').length,
      items: issues.slice(0, 200),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reconciliation data' });
  }
};

export const getRuleEngine = async (_req, res) => {
  try {
    const setting = await AdminSetting.findOne({ key: 'automationRules' }).lean();
    const defaults = {
      autoApproveLowRiskListings: false,
      autoResolveStaleComplaintsDays: 0,
      highRiskPaymentFailRatePct: 20,
      payoutDelayThresholdDays: 3,
      broadcastOnCriticalIncident: false,
    };
    const rules = { ...defaults, ...(setting?.value || {}) };
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
};

export const updateRuleEngine = async (req, res) => {
  try {
    const input = req.body || {};
    const rules = {
      autoApproveLowRiskListings: Boolean(input.autoApproveLowRiskListings),
      autoResolveStaleComplaintsDays: Math.max(0, Math.min(Number(input.autoResolveStaleComplaintsDays || 0), 365)),
      highRiskPaymentFailRatePct: Math.max(1, Math.min(Number(input.highRiskPaymentFailRatePct || 20), 100)),
      payoutDelayThresholdDays: Math.max(1, Math.min(Number(input.payoutDelayThresholdDays || 3), 60)),
      broadcastOnCriticalIncident: Boolean(input.broadcastOnCriticalIncident),
    };

    const saved = await AdminSetting.findOneAndUpdate(
      { key: 'automationRules' },
      { key: 'automationRules', value: rules },
      { upsert: true, new: true }
    );

    await logAudit(req, 'rule_engine_updated', 'AdminSetting', saved._id, rules);
    res.json({ rules: saved.value || rules });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update rules' });
  }
};

export const getAdminNotes = async (req, res) => {
  try {
    const { entityType, entityId, tag, q } = req.query;
    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = String(entityId);
    if (tag) filter.tags = tag;
    if (q) filter.note = safeRegex(q);

    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 25);
    const [rows, total] = await Promise.all([
      AdminAnnotation.find(filter)
        .populate('updatedBy', 'username displayName role')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AdminAnnotation.countDocuments(filter),
    ]);
    sendPaginated(res, rows, total, page, limit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin notes' });
  }
};

export const upsertAdminNote = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const note = String(req.body?.note || '').trim();
    const tags = Array.isArray(req.body?.tags)
      ? req.body.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12)
      : [];
    if (!note && tags.length === 0) return res.status(400).json({ error: 'Note or tags required' });

    const doc = await AdminAnnotation.findOneAndUpdate(
      { entityType, entityId: String(entityId) },
      {
        entityType,
        entityId: String(entityId),
        note,
        tags,
        updatedBy: req.admin._id,
      },
      { upsert: true, new: true }
    ).populate('updatedBy', 'username displayName role');

    await logAudit(req, 'admin_note_upserted', entityType, entityId, { tags, noteLength: note.length });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save admin note' });
  }
};

export const getExportDataset = async (req, res) => {
  try {
    const dataset = String(req.params.dataset || '').trim();
    const maxRows = Math.max(1, Math.min(Number(req.query.limit || 5000), 10000));
    let rows = [];
    let headers = [];

    if (dataset === 'payments') {
      rows = await Payment.find().sort({ createdAt: -1 }).limit(maxRows).lean();
      headers = ['_id', 'booking', 'amount', 'status', 'payoutStatus', 'ownerAmount', 'createdAt'];
    } else if (dataset === 'bookings') {
      rows = await Booking.find().sort({ createdAt: -1 }).limit(maxRows).lean();
      headers = ['_id', 'property', 'renter', 'status', 'fromDate', 'toDate', 'createdAt'];
    } else if (dataset === 'users') {
      rows = await User.find().sort({ createdAt: -1 }).limit(maxRows).lean();
      headers = ['_id', 'name', 'email', 'role', 'isActive', 'ownerVerificationStatus', 'createdAt'];
    } else if (dataset === 'audit-logs') {
      rows = await AuditLog.find().sort({ createdAt: -1 }).limit(maxRows).lean();
      headers = ['_id', 'adminId', 'action', 'entityType', 'entityId', 'details', 'createdAt'];
    } else {
      return res.status(400).json({ error: 'Unsupported dataset' });
    }

    if (String(req.query.export || '').toLowerCase() !== 'csv') {
      return res.json({
        dataset,
        headers,
        count: rows.length,
        preview: rows.slice(0, 30),
      });
    }

    const csvRows = rows.map((row) =>
      headers.map((header) => toCsvValue(row?.[header])).join(',')
    );
    const csv = [headers.join(','), ...csvRows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${dataset}-${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export dataset' });
  }
};

export const getAdminPermissions = async (_req, res) => {
  try {
    const admins = await Admin.find().select('username displayName role permissions isActive createdAt').sort({ createdAt: -1 }).lean();
    res.json({ admins });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin permissions' });
  }
};

export const updateAdminPermissions = async (req, res) => {
  try {
    const { role, permissions, isActive } = req.body || {};
    const updates = {};
    if (role) updates.role = String(role);
    if (Array.isArray(permissions)) {
      updates.permissions = permissions.map((item) => String(item).trim()).filter(Boolean).slice(0, 50);
    }
    if (typeof isActive === 'boolean') updates.isActive = isActive;
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

    const admin = await Admin.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select('username displayName role permissions isActive createdAt');
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    await logAudit(req, 'admin_permission_updated', 'Admin', req.params.id, updates);
    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update admin permissions' });
  }
};

export const getAuditLogDiff = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id).populate('adminId', 'username displayName').lean();
    if (!log) return res.status(404).json({ error: 'Audit log not found' });

    const details = log.details || {};
    const before = details.before || null;
    const after = details.after || null;

    const changedFields = [];
    if (before && after && typeof before === 'object' && typeof after === 'object') {
      const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
      keys.forEach((key) => {
        const left = before[key];
        const right = after[key];
        if (JSON.stringify(left) !== JSON.stringify(right)) {
          changedFields.push({ field: key, before: left, after: right });
        }
      });
    }

    res.json({
      log,
      diff: {
        before,
        after,
        changedFields,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit diff' });
  }
};

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const buildDepositSummary = (entries = []) => {
  const summary = {
    received: 0,
    deductionsApproved: 0,
    refundsPaid: 0,
    pending: 0,
    netHeld: 0,
  };

  entries.forEach((entry) => {
    const amount = Number(entry.amount || 0);
    if (entry.type === 'deposit_received' && ['recorded', 'approved', 'paid'].includes(entry.status)) {
      summary.received += amount;
    }
    if (entry.type === 'deduction' && entry.status === 'approved') {
      summary.deductionsApproved += amount;
    }
    if (entry.type === 'refund_paid' && entry.status === 'paid') {
      summary.refundsPaid += amount;
    }
    if (entry.status === 'pending') {
      summary.pending += amount;
    }
  });

  summary.netHeld = round2(summary.received - summary.deductionsApproved - summary.refundsPaid);
  Object.keys(summary).forEach((key) => {
    summary[key] = round2(summary[key]);
  });

  return summary;
};

export const getBookingAmendmentsAdmin = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).select('_id fromDate toDate status agreedMonthlyRent').lean();
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const rows = await LeaseAmendment.find({ booking: booking._id })
      .populate('requestedBy', 'name email role')
      .populate('decidedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({ booking, items: rows });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch booking amendments' });
  }
};

export const decideBookingAmendmentAdmin = async (req, res) => {
  try {
    const status = String(req.body?.status || '').toLowerCase();
    const decisionNote = String(req.body?.decisionNote || '').trim();
    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const amendment = await LeaseAmendment.findOne({
      _id: req.params.amendmentId,
      booking: booking._id,
    });
    if (!amendment) return res.status(404).json({ error: 'Amendment not found' });
    if (amendment.status !== 'pending') return res.status(400).json({ error: 'Amendment already decided' });

    if (status === 'approved') {
      const targetFrom = amendment.proposedFromDate || booking.fromDate;
      const targetTo = amendment.proposedToDate || booking.toDate;
      if (new Date(targetTo) < new Date(targetFrom)) {
        return res.status(400).json({ error: 'Invalid amendment date range' });
      }

      const overlap = await findOverlappingApprovedBooking({
        propertyId: booking.property,
        fromDate: targetFrom,
        toDate: targetTo,
        excludeBookingId: booking._id,
      });
      if (overlap) {
        return res.status(409).json({ error: 'Approved amendment would overlap another approved booking' });
      }

      const updates = {
        fromDate: targetFrom,
        toDate: targetTo,
      };
      if (Number.isFinite(amendment.proposedMonthlyRent)) {
        updates.agreedMonthlyRent = amendment.proposedMonthlyRent;
      }
      await Booking.findByIdAndUpdate(booking._id, updates);
      amendment.appliedAt = new Date();
    }

    amendment.status = status;
    amendment.decisionNote = decisionNote;
    amendment.decidedBy = req.admin._id;
    amendment.decidedByRole = 'admin';
    amendment.decidedAt = new Date();
    await amendment.save();

    await logAudit(req, 'booking_amendment_decided', 'LeaseAmendment', amendment._id, {
      bookingId: booking._id,
      status,
      decisionNote,
    });

    return res.json({ success: true, amendment });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update amendment' });
  }
};

export const getBookingDepositLedgerAdmin = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).select('_id status property renter').lean();
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const entries = await DepositLedgerEntry.find({ booking: booking._id })
      .populate('createdBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({
      booking,
      summary: buildDepositSummary(entries),
      items: entries,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch deposit ledger' });
  }
};

export const updateBookingDepositLedgerEntryAdmin = async (req, res) => {
  try {
    const status = String(req.body?.status || '').toLowerCase();
    const note = String(req.body?.note || '').trim();
    if (!['approved', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const entry = await DepositLedgerEntry.findOne({
      _id: req.params.entryId,
      booking: req.params.id,
    });
    if (!entry) return res.status(404).json({ error: 'Ledger entry not found' });

    if (status === 'paid') {
      if (entry.type !== 'refund_requested') {
        return res.status(400).json({ error: 'Only refund request can be marked paid' });
      }
      if (!['approved', 'paid'].includes(entry.status)) {
        return res.status(400).json({ error: 'Refund request must be approved before paid' });
      }
      entry.status = 'paid';
      entry.note = [entry.note, note].filter(Boolean).join(' | ');
      entry.approvedBy = req.admin._id;
      entry.approvedByRole = 'admin';
      entry.approvedAt = new Date();
      await entry.save();

      await DepositLedgerEntry.create({
        booking: entry.booking,
        property: entry.property,
        renter: entry.renter,
        owner: entry.owner,
        type: 'refund_paid',
        status: 'paid',
        amount: entry.amount,
        reason: 'Refund paid',
        note,
        metadata: { sourceEntryId: entry._id },
        createdBy: req.admin._id,
        createdByRole: 'admin',
      });
    } else {
      if (entry.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending entries can be approved/rejected' });
      }
      entry.status = status;
      entry.note = [entry.note, note].filter(Boolean).join(' | ');
      entry.approvedBy = req.admin._id;
      entry.approvedByRole = 'admin';
      entry.approvedAt = new Date();
      await entry.save();
    }

    await logAudit(req, 'deposit_ledger_entry_updated', 'DepositLedgerEntry', entry._id, {
      status,
      note,
      bookingId: req.params.id,
    });

    return res.json({ success: true, entry });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update ledger entry' });
  }
};
