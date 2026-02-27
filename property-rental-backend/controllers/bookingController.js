import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import Agreement from '../models/Agreement.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { sendNotification } from '../socket.js';
import { sendNewBookingNotification, sendBookingStatusNotification } from '../cronJobs/paymentReminder.js';

const WORKFLOW_STEPS = [
  { key: 'requested', label: 'Requested' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'agreement_signed', label: 'Agreement Signed' },
  { key: 'paid', label: 'Paid' },
  { key: 'moved_in', label: 'Moved In' },
];

const stageLabelMap = {
  requested: 'Requested',
  accepted: 'Accepted',
  agreement_signed: 'Agreement Signed',
  paid: 'Paid',
  moved_in: 'Moved In',
  rejected: 'Rejected',
};

const toStartOfDay = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getActiveAgreementVersion = (agreement) => {
  if (!agreement) return null;
  const versions = Array.isArray(agreement.versions) ? agreement.versions : [];
  return (
    versions.find((version) => Number(version.version) === Number(agreement.currentVersion)) ||
    versions[versions.length - 1] ||
    null
  );
};

const buildBookingWorkflow = (bookingDoc, agreementDoc, paidPaymentSummary) => {
  const status = bookingDoc.status || 'Pending';
  const approved = status === 'Approved';
  const rejected = status === 'Rejected';

  const activeAgreementVersion = getActiveAgreementVersion(agreementDoc);
  const agreementSigned = approved && activeAgreementVersion?.status === 'fully_signed';
  const paid = agreementSigned && Boolean(paidPaymentSummary);

  const fromDate = bookingDoc.fromDate ? new Date(bookingDoc.fromDate) : null;
  const movedIn =
    paid &&
    fromDate &&
    toStartOfDay(new Date()) >= toStartOfDay(fromDate);

  let stage = 'requested';
  if (rejected) stage = 'rejected';
  else if (movedIn) stage = 'moved_in';
  else if (paid) stage = 'paid';
  else if (agreementSigned) stage = 'agreement_signed';
  else if (approved) stage = 'accepted';

  const requestedAt = bookingDoc.createdAt || bookingDoc.fromDate || null;
  const acceptedAt = bookingDoc.acceptedAt || null;
  const rejectedAt = bookingDoc.rejectedAt || null;
  const agreementSignedAt =
    activeAgreementVersion?.renterSignedAt ||
    activeAgreementVersion?.ownerSignedAt ||
    null;
  const paidAt = paidPaymentSummary?.paidAt || null;
  const movedInAt = movedIn && fromDate ? fromDate : null;

  const stepTimeMap = {
    requested: requestedAt,
    accepted: acceptedAt,
    agreement_signed: agreementSignedAt,
    paid: paidAt,
    moved_in: movedInAt,
  };

  const stageIndex = WORKFLOW_STEPS.findIndex((step) => step.key === stage);
  const steps = WORKFLOW_STEPS.map((step, index) => ({
    key: step.key,
    label: step.label,
    completed: stage !== 'rejected' && index <= stageIndex,
    active: stage !== 'rejected' && index === stageIndex,
    at: stepTimeMap[step.key] || null,
  }));

  return {
    stage,
    label: stageLabelMap[stage] || 'Requested',
    rejected,
    requestedAt,
    acceptedAt,
    rejectedAt,
    agreementSignedAt,
    paidAt,
    movedInAt,
    flags: {
      approved,
      agreementSigned,
      paid,
      movedIn,
    },
    steps,
  };
};

const decorateBookingsWithWorkflow = async (bookings = []) => {
  if (!Array.isArray(bookings) || !bookings.length) return [];

  const bookingDocs = bookings.map((booking) =>
    typeof booking.toObject === 'function' ? booking.toObject() : booking
  );
  const bookingIds = bookingDocs.map((booking) => booking._id);

  const [agreements, paidPayments] = await Promise.all([
    Agreement.find({ booking: { $in: bookingIds } })
      .select('booking currentVersion versions')
      .lean(),
    Payment.aggregate([
      { $match: { booking: { $in: bookingIds }, status: 'Paid' } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$booking',
          paidAt: { $first: '$createdAt' },
          paymentId: { $first: '$_id' },
        },
      },
    ]),
  ]);

  const agreementMap = new Map(
    agreements.map((agreement) => [agreement.booking.toString(), agreement])
  );
  const paidPaymentMap = new Map(
    paidPayments.map((payment) => [payment._id.toString(), payment])
  );

  return bookingDocs.map((booking) => {
    const bookingId = booking._id.toString();
    const workflow = buildBookingWorkflow(
      booking,
      agreementMap.get(bookingId),
      paidPaymentMap.get(bookingId)
    );
    return {
      ...booking,
      workflow,
    };
  });
};

// ==========================
// CREATE BOOKING
// ==========================
export const createBooking = async (req, res) => {
  const { propertyId, fromDate, toDate, bookingDetails = {} } = req.body;

  if (!propertyId || !fromDate) {
    return res.status(400).json({ error: 'Property ID and fromDate are required' });
  }

  if (!bookingDetails.fullName || !bookingDetails.phone || !bookingDetails.occupants) {
    return res.status(400).json({
      error: 'Full name, phone number, and number of occupants are required',
    });
  }

  try {
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate || fromDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid booking dates' });
    }
    if (endDate < startDate) {
      return res.status(400).json({ error: 'toDate cannot be earlier than fromDate' });
    }

    // Prevent overlapping reservations for the same property.
    const overlappingBooking = await Booking.findOne({
      property: propertyId,
      status: { $in: ['Pending', 'Approved'] },
      fromDate: { $lte: endDate },
      toDate: { $gte: startDate },
    });

    if (overlappingBooking) {
      return res.status(409).json({
        error: 'This property is already booked for the selected date range',
      });
    }

    const booking = new Booking({
      property: propertyId,
      renter: req.user._id,
      fromDate: startDate,
      toDate: endDate,
      bookingDetails: {
        fullName: bookingDetails.fullName,
        phone: bookingDetails.phone,
        email: bookingDetails.email,
        occupants: Number(bookingDetails.occupants),
        employmentStatus: bookingDetails.employmentStatus,
        monthlyIncome: bookingDetails.monthlyIncome ? Number(bookingDetails.monthlyIncome) : undefined,
        moveInReason: bookingDetails.moveInReason,
        emergencyContactName: bookingDetails.emergencyContactName,
        emergencyContactPhone: bookingDetails.emergencyContactPhone,
        noteToOwner: bookingDetails.noteToOwner,
      },
      acceptedAt: null,
      rejectedAt: null,
    });

    await booking.save();

    // ✅ Notify property owner about new booking
    const property = await Property.findById(propertyId);
    if (property && property.ownerId) {
      await sendNewBookingNotification(property.ownerId, property.title, booking._id);
    }

    const [decoratedBooking] = await decorateBookingsWithWorkflow([booking]);
    res.status(201).json({ message: 'Booking successful', booking: decoratedBooking || booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==========================
// GET BOOKINGS OF CURRENT RENTER
// ==========================
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ renter: req.user._id }).populate('property');
    const decorated = await decorateBookingsWithWorkflow(bookings);
    res.json(decorated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching bookings' });
  }
};

// ==========================
// GET BOOKINGS OF OWNER
// ==========================
export const getOwnerBookings = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const ownerProperties = await Property.find({ ownerId }).select('_id').lean();
    const ownerPropertyIds = ownerProperties.map((p) => p._id);

    if (!ownerPropertyIds.length) {
      return res.status(200).json([]);
    }

    const bookings = await Booking.find({ property: { $in: ownerPropertyIds } })
      .populate('property')
      .populate('renter', 'name email');

    const decorated = await decorateBookingsWithWorkflow(bookings);
    res.status(200).json(decorated);
  } catch (err) {
    console.error('❌ Error in getOwnerBookings:', err.message);
    res.status(500).json({ error: 'Failed to fetch owner bookings' });
  }
};

// ==========================
// UPDATE BOOKING STATUS
// ==========================
export const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['Approved', 'Rejected'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const booking = await Booking.findById(id).populate({
      path: 'property',
      select: 'ownerId title',
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.property.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    booking.status = status;
    if (status === 'Approved') {
      booking.acceptedAt = new Date();
      booking.rejectedAt = null;
    } else if (status === 'Rejected') {
      booking.rejectedAt = new Date();
      booking.acceptedAt = null;
    }
    await booking.save();

    // ✅ Notify renter about booking status update
    await sendBookingStatusNotification(
      booking.renter,
      status.toLowerCase(),
      booking.property.title,
      booking._id
    );

    const [decoratedBooking] = await decorateBookingsWithWorkflow([booking]);
    res.status(200).json({ message: 'Status updated', booking: decoratedBooking || booking });
  } catch (err) {
    console.error('Error updating booking status:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==========================
// GET APPROVED BOOKINGS FOR A RENTER
// ==========================
export const getApprovedBookings = async (req, res) => {
  try {
    const requestedRenterId = req.params.renterId;
    let renterId = requestedRenterId;
    let bookingFilter = { status: 'Approved' };

    if (req.user.role === 'renter') {
      if (req.user._id.toString() !== requestedRenterId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      renterId = req.user._id;
      bookingFilter.renter = renterId;
    } else if (req.user.role === 'owner') {
      const ownerProperties = await Property.find({ ownerId: req.user._id }).select('_id').lean();
      const ownerPropertyIds = ownerProperties.map((property) => property._id);
      if (!ownerPropertyIds.length) return res.json([]);
      bookingFilter = {
        ...bookingFilter,
        renter: renterId,
        property: { $in: ownerPropertyIds },
      };
    } else if (req.user.role === 'admin') {
      bookingFilter.renter = renterId;
    } else {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const bookings = await Booking.find(bookingFilter).populate('property');
    const decorated = await decorateBookingsWithWorkflow(bookings);
    res.json(decorated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};

export const renewBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const months = Math.max(1, Math.min(Number(req.body?.months || 1), 12));
    const note = String(req.body?.note || '').trim();

    const booking = await Booking.findById(id).populate('property');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isRenter = booking.renter.toString() === req.user._id.toString();
    const isOwner = booking.property?.ownerId?.toString() === req.user._id.toString();
    if (!isRenter && !isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to renew this booking' });
    }

    if (booking.status !== 'Approved') {
      return res.status(400).json({ error: 'Only approved bookings can be renewed' });
    }

    const renterUser = await User.findById(booking.renter).select('name');
    const propertyTitle = booking.property?.title || 'property';
    if (isRenter && !isOwner && req.user.role !== 'admin') {
      booking.renewalStatus = 'pending';
      booking.renewalRequestedAt = new Date();
      booking.renewalApprovedAt = null;
      booking.renewalMonths = months;
      booking.renewalNote = note;
      await booking.save();

      if (booking.property?.ownerId) {
        await sendNotification(
          booking.property.ownerId,
          'leaseRenewal',
          `${renterUser?.name || 'Renter'} requested lease renewal for "${propertyTitle}" (${months} month(s)).`,
          '/owner/requests'
        );
      }

      const [decoratedPending] = await decorateBookingsWithWorkflow([booking]);
      return res.json({
        success: true,
        mode: 'requested',
        message: 'Renewal request sent to owner',
        booking: decoratedPending || booking,
      });
    }

    const currentEnd = booking.toDate ? new Date(booking.toDate) : new Date(booking.fromDate);
    const renewedEnd = new Date(currentEnd);
    renewedEnd.setMonth(renewedEnd.getMonth() + months);

    booking.toDate = renewedEnd;
    booking.renewalStatus = 'approved';
    booking.renewalRequestedAt = booking.renewalRequestedAt || new Date();
    booking.renewalApprovedAt = new Date();
    booking.renewalMonths = months;
    booking.renewalNote = note || booking.renewalNote;
    await booking.save();

    await sendNotification(
      booking.renter,
      'leaseRenewal',
      `Your booking for "${propertyTitle}" has been renewed by ${months} month(s).`,
      '/renter/bookings'
    );

    const [decorated] = await decorateBookingsWithWorkflow([booking]);
    return res.json({
      success: true,
      mode: 'approved',
      message: 'Lease renewed successfully',
      booking: decorated || booking,
    });
  } catch (err) {
    console.error('renewBooking error:', err);
    return res.status(500).json({ error: 'Failed to renew booking' });
  }
};
