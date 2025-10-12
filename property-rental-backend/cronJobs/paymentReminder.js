import Booking from '../models/Booking.js';
import { sendNotification } from '../socket.js';

export const sendTestPaymentReminder = async () => {
  try {
    // Get all bookings with pending payments (ignore time)
    const upcoming = await Booking.find({
      paymentStatus: 'pending'
    }).populate('renter property');

    for (const booking of upcoming) {
      if (!booking.renter) continue; // safety check
      await sendNotification(
        booking.renter._id,
        'payment',
        `Your rent for "${booking.property.title}" is due soon.`,
        `/bookings/${booking._id}`
      );
    }

    console.log(`[Reminder] Sent ${upcoming.length} notifications`);
  } catch (err) {
    console.error('Reminder error:', err.message);
  }
};

// Optional test trigger: run immediately after server starts
setTimeout(sendTestPaymentReminder, 1000); // 1 second after server starts
