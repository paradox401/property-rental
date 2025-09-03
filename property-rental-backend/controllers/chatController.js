import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import User from '../models/User.js';

export const getAllowedChatUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    let bookings;
    if (req.user.role === 'renter') {
      // Renter: fetch approved bookings made by this renter
      bookings = await Booking.find({ renter: currentUserId, status: 'Approved' })
        .populate({
          path: 'property',
          select: 'ownerId',
          populate: { path: 'ownerId', model: 'User', select: '_id name email' }
        });
    } else if (req.user.role === 'owner') {
      // Owner: fetch all approved bookings
      bookings = await Booking.find({ status: 'Approved' })
        .populate({
          path: 'property',
          select: 'ownerId',
          populate: { path: 'ownerId', model: 'User', select: '_id name email' }
        })
        .populate('renter', 'name email');
      // filter only bookings for properties owned by this owner
      bookings = bookings.filter(
        (b) => b.property?.ownerId?._id.toString() === currentUserId.toString()
      );
    }

    const usersMap = new Map();
    bookings.forEach((booking) => {
      let otherUser;
      if (req.user.role === 'renter') {
        otherUser = booking.property?.ownerId;
      } else {
        otherUser = booking.renter;
      }

      if (otherUser && !usersMap.has(otherUser._id.toString())) {
        usersMap.set(otherUser._id.toString(), otherUser);
      }
    });

    res.json(Array.from(usersMap.values()));
  } catch (err) {
    console.error('Error fetching allowed chat users:', err);
    res.status(500).json({ error: 'Failed to fetch allowed chat users' });
  }
};
