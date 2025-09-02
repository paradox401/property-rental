import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  getMessages,
  sendMessage
} from '../controllers/messageController.js';

const router = express.Router();

router.get('/:recipientId', protect, getMessages);
router.post('/', protect, sendMessage);

export default router;
