import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  createPayment,
  getRenterPayments,
  updatePaymentStatus,
  verifyPayment,
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create', protect, createPayment);            // /api/payments/create
router.get('/history', protect, getRenterPayments);        // /api/payments/history
router.put('/status', protect, updatePaymentStatus);       // /api/payments/status
router.post('/verify', protect, verifyPayment);            // /api/payments/verify

export default router;
