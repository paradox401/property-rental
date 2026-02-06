import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  updateStatus,
  getApprovedBookings,
} from '../controllers/bookingController.js';

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.get('/owner', protect, getOwnerBookings);
router.put('/:id/status', protect, updateStatus);
router.get('/approved/:renterId', protect, getApprovedBookings);

export default router;
