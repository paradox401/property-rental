import Booking from '../models/Booking.js';
import { sendNotification } from '../socket.js';

export const sendTestPaymentReminder = async () => {
  try {
    const now = new Date();
    const fiveMinutesLater = new Date(Date.now() + 5 * 60 * 1000);

    // Find bookings with pending payments due within next 5 minutes
    const upcoming = await Booking.find({
      paymentStatus: 'pending',
      toDate: { $gte: now, $lte: fiveMinutesLater }
    }).populate('renter property');

    for (const booking of upcoming) {
      await sendNotification(
        booking.renter._id,
        'payment',
        `Your rent for "${booking.property.title}" is due soon.`,
        `/bookings/${booking._id}`
      );
    }

    console.log(`[TestPaymentReminder] Sent ${upcoming.length} notifications at ${now.toISOString()}`);
  } catch (err) {
    console.error('Test payment reminder error:', err.message);
  }
};

// Trigger exactly 5 minutes from now
setTimeout(sendTestPaymentReminder, 5 * 60 * 1000);
