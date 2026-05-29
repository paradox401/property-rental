import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  approximateLocation: { type: String, trim: true, default: '' },
  price: { type: Number, required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  description: { type: String },
  type: { type: String, enum: ['Apartment', 'House', 'Condo'], required: true },
  image: { type: String },
  images: {
    type: [String],
    default: [],
    validate: {
      validator: (value) => !Array.isArray(value) || value.length <= 5,
      message: 'A property can have up to 5 images',
    },
  },
  parkingAvailable: { type: Boolean, default: false },
  petFriendly: { type: Boolean, default: false },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  reviewChecklist: {
    photoQuality: { type: Boolean, default: false },
    locationClarity: { type: Boolean, default: false },
    duplicateCheck: { type: Boolean, default: false },
    priceReasonable: { type: Boolean, default: false },
    ownerVerified: { type: Boolean, default: false },
  },
  reviewNote: { type: String, trim: true, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  reviewedAt: { type: Date },
  rating: { type: Number, default: 0, min: 0, max: 5 }

}, {
  timestamps: true
});

export default mongoose.model('Property', propertySchema);
