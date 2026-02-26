
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true,
    default: function () {
      return this.fromDate;
    },
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  renter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'pending_verification', 'paid'],
    default: 'pending'
  },
  bookingDetails: {
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    occupants: { type: Number, min: 1 },
    employmentStatus: { type: String, trim: true },
    monthlyIncome: { type: Number, min: 0 },
    moveInReason: { type: String, trim: true },
    emergencyContactName: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true },
    noteToOwner: { type: String, trim: true },
  }
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
