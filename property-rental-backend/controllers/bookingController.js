import Booking from '../models/Booking.js';

export const createBooking = async (req, res) => {
  const { propertyId } = req.body;

  if (!propertyId) {
    return res.status(400).json({ error: 'Property ID is required' });
  }

  try {
    const exists = await Booking.findOne({
      property: propertyId,
      renter: req.user.id,
    });

    if (exists) {
      return res.status(400).json({ error: 'You have already booked this property' });
    }

    const booking = new Booking({
      property: propertyId,
      renter: req.user.id,
    });

    await booking.save();
    res.status(201).json({ message: 'Booking successful', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ renter: req.user.id }).populate('property');
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching bookings' });
  }
};