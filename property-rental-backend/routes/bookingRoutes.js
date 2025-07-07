import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  updateStatus
} from '../controllers/bookingController.js';

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.get('/owner', protect, getOwnerBookings);
router.put('/:id/status', protect, updateStatus);

export default router;
