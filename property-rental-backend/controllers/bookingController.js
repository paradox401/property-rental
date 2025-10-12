import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import { sendNewBookingNotification, sendBookingStatusNotification } from '../cronJobs/paymentReminder.js';

// ==========================
// CREATE BOOKING
// ==========================
export const createBooking = async (req, res) => {
  const { propertyId, fromDate, toDate } = req.body;

  if (!propertyId || !fromDate || !toDate) {
    return res.status(400).json({ error: 'Property ID, fromDate, and toDate are required' });
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
      toDate,
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

    const bookings = await Booking.find()
      .populate({
        path: 'property',
        populate: {
          path: 'ownerId',
          model: 'User',
          select: '_id name email',
        },
      })
      .populate('renter', 'name email');

    const filteredBookings = bookings.filter(
      (booking) =>
        booking.property &&
        booking.property.ownerId &&
        booking.property.ownerId._id.toString() === ownerId.toString()
    );

    res.status(200).json(filteredBookings);
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
    const renterId = req.params.renterId;
    const bookings = await Booking.find({ renter: renterId, status: "Approved" })
      .populate("property");
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};
