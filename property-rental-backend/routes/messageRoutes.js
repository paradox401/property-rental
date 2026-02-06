import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { getMessages, sendMessage, markConversationRead } from '../controllers/messageController.js';

const router = express.Router();

router.get('/:recipientId', protect, getMessages);
router.post('/', protect, sendMessage);
router.patch('/read/:recipientId', protect, markConversationRead);

export default router;
