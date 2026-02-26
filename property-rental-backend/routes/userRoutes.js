import express from 'express';
import User from '../models/User.js';
import protect from '../middleware/authMiddleware.js';
import adminOnly from '../middleware/adminMiddleware.js';
import { sendNotification } from '../socket.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/me/preferences', protect, async (req, res) => {
  try {
    const { notificationPreferences } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.notificationPreferences = {
      ...user.notificationPreferences?.toObject?.(),
      ...notificationPreferences,
      types: {
        ...user.notificationPreferences?.types?.toObject?.(),
        ...(notificationPreferences?.types || {}),
      },
    };

    await user.save();
    res.json({ message: 'Preferences updated', preferences: user.notificationPreferences });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.post('/owner/verify-request', protect, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Only owners can request verification' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.ownerVerificationStatus === 'verified') {
      return res.status(400).json({ error: 'Already verified' });
    }

    if (user.ownerVerificationStatus === 'pending') {
      return res.status(400).json({ error: 'Verification request is already pending' });
    }

    user.ownerVerificationStatus = 'pending';
    await user.save();

    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      try {
        await sendNotification(
          admin._id,
          'ownerVerification',
          `Owner verification requested by ${user.name}`,
          `/admin/owners`
        );
      } catch (notifyErr) {
        console.error('Owner verification notify(admin) failed:', notifyErr.message);
      }
    }

    res.json({ message: 'Verification request submitted', status: user.ownerVerificationStatus });
  } catch (err) {
    console.error('owner/verify-request error:', err);
    res.status(500).json({ error: 'Failed to submit verification request' });
  }
});

router.get('/admin/owner-requests', protect, adminOnly, async (req, res) => {
  try {
    const owners = await User.find({ role: 'owner', ownerVerificationStatus: 'pending' }).select(
      '-password'
    );
    res.json(owners);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch owner requests' });
  }
});

router.put('/admin/owner-requests/:id', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const owner = await User.findById(req.params.id);
    if (!owner) return res.status(404).json({ error: 'Owner not found' });
    if (owner.role !== 'owner') return res.status(400).json({ error: 'User is not an owner' });

    owner.ownerVerificationStatus = status;
    owner.ownerVerifiedAt = status === 'verified' ? new Date() : undefined;
    await owner.save();

    try {
      await sendNotification(
        owner._id,
        'ownerVerification',
        `Your verification was ${status}.`,
        `/owner`
      );
    } catch (notifyErr) {
      console.error('Owner verification notify(owner) failed:', notifyErr.message);
    }

    res.json({ message: 'Owner verification updated', owner });
  } catch (err) {
    console.error('admin/owner-requests update error:', err);
    res.status(500).json({ error: 'Failed to update owner status' });
  }
});

export default router;
