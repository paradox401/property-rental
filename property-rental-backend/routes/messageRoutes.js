import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  getConversationSummaries,
  getMessages,
  sendMessage,
  markConversationRead,
} from '../controllers/messageController.js';

const router = express.Router();

router.get('/conversations', protect, getConversationSummaries);
router.get('/:recipientId', protect, getMessages);
router.post('/', protect, sendMessage);
router.patch('/read/:recipientId', protect, markConversationRead);

export default router;
