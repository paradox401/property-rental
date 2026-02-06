import express from 'express';
import {
  addProperty,
  getMyProperties,
  deleteProperty,
  updateProperty,
  getProperty,
  getPropertyById,
  getOwnerPropertiesWithBookingStatus,
  addReview,
  getReviews,
  adminGetPendingProperties,
  adminUpdatePropertyStatus,
} from '../controllers/propertyController.js';
import protect from '../middleware/authMiddleware.js';
import optionalAuth from '../middleware/optionalAuth.js';
import adminOnly from '../middleware/adminMiddleware.js';

const router = express.Router();

router.get('/admin/pending', protect, adminOnly, adminGetPendingProperties);
router.put('/admin/:id/status', protect, adminOnly, adminUpdatePropertyStatus);

router.get('/my', protect, getOwnerPropertiesWithBookingStatus);
router.post('/', protect, addProperty);
router.put('/:id', protect, updateProperty);
router.delete('/:id', protect, deleteProperty);
router.get('/', getProperty);
router.get('/:id', optionalAuth, getPropertyById);

router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', protect, addReview);

export default router;
