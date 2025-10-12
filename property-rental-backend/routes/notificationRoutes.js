import express from 'express';
import protect from '../middleware/authMiddleware.js';
import Notification from '../models/Notification.js';
import { sendNotification } from '../socket.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    notification.read = true;
    await notification.save();
    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/test-send', async (req, res) => {
  const testUserId = 'PUT_A_REAL_USER_ID_HERE'; // replace with a valid user _id from MongoDB
  await sendNotification(testUserId, 'payment', 'Test notification from server!', '/');
  res.json({ success: true });
});

export default router;
