import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  pid: { type: String, required: true, unique: true },
  status: { type: String, enum: ['Pending', 'Success', 'Failed'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['Khalti', 'eSewa'], required: true },
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
