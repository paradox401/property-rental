import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  pid: { type: String, sparse: true, unique: true },
  transactionRef: { type: String },
  adminRemark: { type: String },
  status: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['Khalti', 'eSewa', 'QR'], required: true },
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
