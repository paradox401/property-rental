import express from 'express';
import { adminAuthMiddleware } from '../middlewares/adminAuth.js';
import {
  getOverview,
  getAllUsers,
  updateUserStatus,
  getOwnerRequests,
  updateOwnerRequest,
  getAllProperties,
  updatePropertyStatus,
  deleteProperty,
  getAllBookings,
  updateBookingStatus,
  getAllPayments,
  updatePaymentStatus,
  getAllComplaints,
  updateComplaintStatus,
  getAllMessages,
  getAllReviews,
  deleteReview,
  getSettings,
  upsertSettings,
  getFeaturedListings,
  updateFeaturedListings,
  sendBroadcast,
  getReports,
  getAuditLogs,
} from '../controllers/adminController.js';

const router = express.Router();
router.use(adminAuthMiddleware);

router.get('/overview', getOverview);

router.get('/users', getAllUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/owner-requests', getOwnerRequests);
router.patch('/owner-requests/:id', updateOwnerRequest);

router.get('/properties', getAllProperties);
router.patch('/properties/:id/status', updatePropertyStatus);
router.delete('/properties/:id', deleteProperty);

router.get('/bookings', getAllBookings);
router.patch('/bookings/:id/status', updateBookingStatus);

router.get('/payments', getAllPayments);
router.patch('/payments/:id/status', updatePaymentStatus);

router.get('/complaints', getAllComplaints);
router.patch('/complaints/:id/status', updateComplaintStatus);

router.get('/messages', getAllMessages);
router.get('/reviews', getAllReviews);
router.delete('/reviews/:propertyId/:reviewId', deleteReview);

router.get('/settings', getSettings);
router.put('/settings', upsertSettings);

router.get('/featured-listings', getFeaturedListings);
router.put('/featured-listings', updateFeaturedListings);

router.post('/broadcast', sendBroadcast);
router.get('/reports', getReports);
router.get('/audit-logs', getAuditLogs);

export default router;
