import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import { sendNotification } from '../socket.js';
import cron from 'node-cron';

const notificationTypes = {
  PAYMENT: 'payment',
  NEW_BOOKING: 'newBooking',
  BOOKING_ACCEPTED: 'bookingAccepted',
  BOOKING_REJECTED: 'bookingRejected',
  NEW_LISTING: 'newListing',
};

// ==========================
// PAYMENT REMINDERS
// ==========================
export const sendPaymentReminders = async () => {
  try {
    const pendingBookings = await Booking.find({ paymentStatus: 'pending' }).populate('renter property');

    for (const booking of pendingBookings) {
      if (!booking.renter) continue;

      const exists = await Notification.findOne({
        userId: booking.renter._id,
        type: notificationTypes.PAYMENT,
        link: `/bookings/${booking._id}`,
      });

      if (exists) continue;

      await sendNotification(
        booking.renter._id,
        notificationTypes.PAYMENT,
        `Your rent for "${booking.property.title}" is due soon.`,
        `/bookings/${booking._id}`
      );
    }

    console.log(`[Reminder] Checked ${pendingBookings.length} pending bookings`);
  } catch (err) {
    console.error('❌ Payment reminder error:', err.message);
  }
};

// ==========================
// NEW BOOKING NOTIFICATIONS
// ==========================
export const sendNewBookingNotification = async (ownerId, propertyTitle, bookingId) => {
  try {
    const exists = await Notification.findOne({
      userId: ownerId,
      type: notificationTypes.NEW_BOOKING,
      link: `/bookings/${bookingId}`,
    });

    if (exists) return;

    await sendNotification(
      ownerId,
      notificationTypes.NEW_BOOKING,
      `You have a new booking request for "${propertyTitle}".`,
      `/bookings/${bookingId}`
    );
  } catch (err) {
    console.error('❌ New booking notification error:', err.message);
  }
};

// ==========================
// BOOKING STATUS NOTIFICATIONS
// ==========================
export const sendBookingStatusNotification = async (renterId, status, propertyTitle, bookingId) => {
  try {
    const normalizedStatus = status.toLowerCase();
    const type = (normalizedStatus === 'approved' || normalizedStatus === 'accepted') 
      ? 'bookingAccepted' 
      : 'bookingRejected';
      
    const message = type === 'bookingAccepted' 
      ? `Your booking for "${propertyTitle}" has been accepted!` 
      : `Your booking for "${propertyTitle}" was rejected.`;

    const exists = await Notification.findOne({
      userId: renterId,
      type,
      link: `/bookings/${bookingId}`,
    });

    if (exists) return;

    await sendNotification(renterId, type, message, `/bookings/${bookingId}`);
  } catch (err) {
    console.error('❌ Booking status notification error:', err.message);
  }
};


// ==========================
// DAILY SCHEDULE
// ==========================
// Run once immediately when backend starts
sendPaymentReminders();

// Schedule once every 24 hours (daily at 8:00 AM server time)
cron.schedule('0 8 * * *', () => {
  console.log('🕗 Running daily payment reminders...');
  sendPaymentReminders();
});
