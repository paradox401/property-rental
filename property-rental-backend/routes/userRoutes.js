import express from 'express';
import User from '../models/User.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/users — Get all users except the logged-in one
router.get('/', protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select('-password');
    res.json(users); // Return plain array
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
