import mongoose from 'mongoose';

const notificationPreferencesSchema = new mongoose.Schema(
  {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    types: {
      payment: { type: Boolean, default: true },
      newBooking: { type: Boolean, default: true },
      bookingAccepted: { type: Boolean, default: true },
      bookingRejected: { type: Boolean, default: true },
      newListing: { type: Boolean, default: true },
      listingApproval: { type: Boolean, default: true },
      ownerVerification: { type: Boolean, default: true },
      message: { type: Boolean, default: true },
      review: { type: Boolean, default: true },
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  citizenshipNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['owner', 'renter', 'admin'], default: 'renter' },
  ownerVerificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified',
  },
  ownerVerifiedAt: { type: Date },
  ownerVerificationDocument: {
    imageUrl: { type: String },
    publicId: { type: String },
    submittedAt: { type: Date },
  },
  notificationPreferences: {
    type: notificationPreferencesSchema,
    default: () => ({}),
  },
  resetPasswordTokenHash: { type: String, select: false },
  resetPasswordExpiresAt: { type: Date, select: false },
});

export default mongoose.model('User', userSchema);
