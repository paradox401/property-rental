import express from 'express';
import User from '../models/User.js';
import protect from '../middleware/authMiddleware.js';
import adminOnly from '../middleware/adminMiddleware.js';
import { sendNotification } from '../socket.js';
import upload from '../middleware/uploadMiddleware.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

const uploadImageBufferToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'property-rental/owner-verification',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );
    stream.end(buffer);
  });

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
    const { notificationPreferences, privacyPreferences, appPreferences } = req.body;

    const user = await User.findById(req.user._id)
      .select('notificationPreferences privacyPreferences appPreferences');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updateDoc = {};

    if (notificationPreferences) {
      updateDoc.notificationPreferences = {
        ...user.notificationPreferences?.toObject?.(),
        ...notificationPreferences,
        types: {
          ...user.notificationPreferences?.types?.toObject?.(),
          ...(notificationPreferences?.types || {}),
        },
      };
    }

    if (privacyPreferences) {
      updateDoc.privacyPreferences = {
        ...user.privacyPreferences?.toObject?.(),
        ...privacyPreferences,
      };
    }

    if (appPreferences) {
      const allowedThemes = ['light', 'dark', 'system'];
      const nextTheme = allowedThemes.includes(appPreferences.theme)
        ? appPreferences.theme
        : user.appPreferences?.theme || 'system';
      const nextLanguage = ['en', 'ne'].includes(appPreferences.language)
        ? appPreferences.language
        : user.appPreferences?.language || 'en';

      updateDoc.appPreferences = {
        ...user.appPreferences?.toObject?.(),
        ...appPreferences,
        theme: nextTheme,
        language: nextLanguage,
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateDoc },
      { new: true, runValidators: true }
    ).select('notificationPreferences privacyPreferences appPreferences');

    res.json({
      message: 'Preferences updated',
      preferences: {
        notificationPreferences: updatedUser.notificationPreferences,
        privacyPreferences: updatedUser.privacyPreferences,
        appPreferences: updatedUser.appPreferences,
      },
    });
  } catch (err) {
    console.error('Failed to update user preferences:', err);
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid preference value provided' });
    }
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.post('/owner/verify-request', protect, upload.single('idImage'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('role ownerVerificationStatus name');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'owner') {
      return res.status(403).json({ error: 'Only owners can request verification' });
    }

    if (user.ownerVerificationStatus === 'verified') {
      return res.status(400).json({ error: 'Already verified' });
    }

    if (user.ownerVerificationStatus === 'pending') {
      return res.status(400).json({ error: 'Verification request is already pending' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a valid ID photo to request verification' });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ error: 'Cloudinary credentials are not configured on server' });
    }

    const uploaded = await uploadImageBufferToCloudinary(req.file.buffer);

    await User.findByIdAndUpdate(req.user._id, {
      ownerVerificationStatus: 'pending',
      ownerVerificationDocument: {
        imageUrl: uploaded.secure_url,
        publicId: uploaded.public_id,
        submittedAt: new Date(),
      },
    });

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

    res.json({ message: 'Verification request submitted', status: 'pending' });
  } catch (err) {
    console.error('owner/verify-request error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit verification request' });
  }
});

router.get('/admin/owner-requests', protect, adminOnly, async (req, res) => {
  try {
    const owners = await User.find({ role: 'owner', ownerVerificationStatus: 'pending' }).select('-password');
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

    const owner = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'owner' },
      {
        ownerVerificationStatus: status,
        ownerVerifiedAt: status === 'verified' ? new Date() : null,
      },
      { new: true }
    ).select('name email role ownerVerificationStatus ownerVerifiedAt');
    if (!owner) return res.status(404).json({ error: 'Owner not found' });

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
    res.status(500).json({ error: err.message || 'Failed to update owner status' });
  }
});

export default router;
