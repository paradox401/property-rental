import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import { sendNewBookingNotification, sendBookingStatusNotification } from '../cronJobs/paymentReminder.js';

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
    const exists = await Booking.findOne({
      property: propertyId,
      renter: req.user._id,
    });

    if (exists) {
      return res.status(400).json({ error: 'You have already booked this property' });
    }

    const booking = new Booking({
      property: propertyId,
      renter: req.user._id,
      fromDate,
      toDate: toDate || fromDate,
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
    });

    await booking.save();

    // ✅ Notify property owner about new booking
    const property = await Property.findById(propertyId);
    if (property && property.ownerId) {
      await sendNewBookingNotification(property.ownerId, property.title, booking._id);
    }

    res.status(201).json({ message: 'Booking successful', booking });
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
    res.json(bookings);
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

    res.status(200).json(bookings);
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
    await booking.save();

    // ✅ Notify renter about booking status update
    await sendBookingStatusNotification(
      booking.renter,
      status.toLowerCase(),
      booking.property.title,
      booking._id
    );

    res.status(200).json({ message: 'Status updated', booking });
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
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};
