import express from 'express';
import { adminAuthMiddleware, requireAdminPermission } from '../middlewares/adminAuth.js';
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
  getOpsInbox,
  runBulkAction,
  getSlaDashboard,
  getIncidentBanner,
  getReconciliation,
  getRuleEngine,
  updateRuleEngine,
  getAdminNotes,
  upsertAdminNote,
  getExportDataset,
  getAdminPermissions,
  updateAdminPermissions,
  getAuditLogDiff,
  getBookingAmendmentsAdmin,
  decideBookingAmendmentAdmin,
  getBookingDepositLedgerAdmin,
  updateBookingDepositLedgerEntryAdmin,
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
router.get('/bookings/:id/amendments', requireAdminPermission('workflow:read'), getBookingAmendmentsAdmin);
router.patch('/bookings/:id/amendments/:amendmentId', requireAdminPermission('workflow:write'), decideBookingAmendmentAdmin);
router.get('/bookings/:id/deposit-ledger', requireAdminPermission('workflow:read'), getBookingDepositLedgerAdmin);
router.patch('/bookings/:id/deposit-ledger/:entryId', requireAdminPermission('workflow:write'), updateBookingDepositLedgerEntryAdmin);

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
router.get('/audit-logs/:id/diff', getAuditLogDiff);
router.get('/dashboard-views', getDashboardViews);
router.post('/dashboard-views', saveDashboardView);
router.delete('/dashboard-views/:id', deleteDashboardView);

router.get('/ops/inbox', requireAdminPermission('workflow:read'), getOpsInbox);
router.post('/ops/bulk-action', requireAdminPermission('workflow:write'), runBulkAction);
router.get('/ops/sla', requireAdminPermission('sla:read'), getSlaDashboard);
router.get('/ops/incidents', requireAdminPermission('workflow:read'), getIncidentBanner);
router.get('/ops/reconciliation', requireAdminPermission('reconciliation:read'), getReconciliation);

router.get('/rules', requireAdminPermission('rules:read'), getRuleEngine);
router.put('/rules', requireAdminPermission('workflow:write'), updateRuleEngine);

router.get('/notes', requireAdminPermission('notes:read'), getAdminNotes);
router.put('/notes/:entityType/:entityId', requireAdminPermission('notes:write'), upsertAdminNote);

router.get('/exports/:dataset', requireAdminPermission('exports:run'), getExportDataset);

router.get('/admins/permissions', requireAdminPermission('audit:read'), getAdminPermissions);
router.patch('/admins/:id/permissions', requireAdminPermission('audit:read'), updateAdminPermissions);

export default router;
