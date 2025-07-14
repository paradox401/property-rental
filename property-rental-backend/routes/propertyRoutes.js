import express from 'express';
import {
  addProperty,
  getMyProperties,
  deleteProperty,
  updateProperty,
  getProperty,
  getPropertyById,
  getOwnerPropertiesWithBookingStatus
} from '../controllers/propertyController.js';
import protect from '../middleware/authMiddleware.js';
const router = express.Router();
router.get('/my', protect, getOwnerPropertiesWithBookingStatus);
router.post('/', protect, addProperty);
router.put('/:id', protect, updateProperty);
router.delete('/:id', protect, deleteProperty);
router.get('/', getProperty); 
router.get('/:id', protect, getPropertyById);

export default router;
