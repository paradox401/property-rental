import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  citizenshipNumber: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['owner', 'renter', 'admin'], default: 'renter' },
  isActive: { type: Boolean, default: true },
  ownerVerificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified',
  },
  ownerVerifiedAt: { type: Date },
}, { timestamps: true, strict: false });

export default mongoose.model('User', userSchema);
