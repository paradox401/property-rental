import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { createBooking, getMyBookings } from '../controllers/bookingController.js';

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);

export default router;
