import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, default: 'system' },
    message: { type: String, required: true },
    link: { type: String, default: '/' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true, strict: false }
);

export default mongoose.model('Notification', notificationSchema);
