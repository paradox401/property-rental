import express from 'express';
import { adminAuthMiddleware } from '../middlewares/adminAuth.js';
import { getAllUsers, getAllProperties, getAllBookings, getAllComplaints, markComplaintResolved } from '../controllers/adminController.js';

const router = express.Router();
router.use(adminAuthMiddleware);

router.get('/users', getAllUsers);
router.get('/properties', getAllProperties);
router.get('/bookings', getAllBookings);
router.get('/complaints', getAllComplaints);
router.patch('/complaints/:id/resolve', markComplaintResolved);

export default router;
