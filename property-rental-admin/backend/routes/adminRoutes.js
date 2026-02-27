import express from 'express';
import { adminAuthMiddleware } from '../middlewares/adminAuth.js';
import {
  getOverview,
  getAllUsers,
  updateUserStatus,
  getOwnerRequests,
  updateOwnerRequest,
  getKycRequests,
  reviewKycDocument,
  reviewKycRequest,
  getAllProperties,
  updatePropertyStatus,
  deleteProperty,
  getAllBookings,
  updateBookingStatus,
  getAllPayments,
  updatePaymentStatus,
  allocateOwnerPayout,
  markOwnerPayoutTransferred,
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
  getRevenueCommandCenter,
  getAuditLogs,
  getDashboardViews,
  saveDashboardView,
  deleteDashboardView,
} from '../controllers/adminController.js';

const router = express.Router();
router.use(adminAuthMiddleware);

router.get('/overview', getOverview);

router.get('/users', getAllUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/owner-requests', getOwnerRequests);
router.patch('/owner-requests/:id', updateOwnerRequest);
router.get('/kyc-requests', getKycRequests);
router.patch('/kyc-requests/:id/documents/:docId', reviewKycDocument);
router.patch('/kyc-requests/:id', reviewKycRequest);

router.get('/properties', getAllProperties);
router.patch('/properties/:id/status', updatePropertyStatus);
router.delete('/properties/:id', deleteProperty);

router.get('/bookings', getAllBookings);
router.patch('/bookings/:id/status', updateBookingStatus);

router.get('/payments', getAllPayments);
router.patch('/payments/:id/status', updatePaymentStatus);
router.post('/payments/:id/allocate-owner', allocateOwnerPayout);
router.patch('/payments/:id/transfer-owner', markOwnerPayoutTransferred);

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
router.get('/revenue-command', getRevenueCommandCenter);
router.get('/audit-logs', getAuditLogs);
router.get('/dashboard-views', getDashboardViews);
router.post('/dashboard-views', saveDashboardView);
router.delete('/dashboard-views/:id', deleteDashboardView);

export default router;
