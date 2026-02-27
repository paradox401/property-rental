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

router.post('/owner/verify-request', protect, upload.array('idImages', 5), async (req, res) => {
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

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one valid ID photo to request verification' });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ error: 'Cloudinary credentials are not configured on server' });
    }

    let docTypes = [];
    if (req.body?.docTypes) {
      try {
        docTypes = JSON.parse(req.body.docTypes);
      } catch {
        docTypes = [];
      }
    }

    const uploadedDocs = [];
    for (let i = 0; i < req.files.length; i += 1) {
      const file = req.files[i];
      const uploaded = await uploadImageBufferToCloudinary(file.buffer);
      uploadedDocs.push({
        imageUrl: uploaded.secure_url,
        publicId: uploaded.public_id,
        docType: docTypes[i] || 'Government ID',
        status: 'pending',
        rejectReason: '',
        uploadedAt: new Date(),
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      ownerVerificationStatus: 'pending',
      ownerVerificationRejectReason: '',
      $push: { ownerVerificationDocuments: { $each: uploadedDocs } },
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
    const owners = await User.find({
      role: 'owner',
      ownerVerificationStatus: 'pending',
      'ownerVerificationDocuments.status': 'pending',
    }).select('-password');
    res.json(owners);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch owner requests' });
  }
});

router.get('/admin/owner-requests/pending-docs', protect, adminOnly, async (req, res) => {
  try {
    const owners = await User.find({ role: 'owner', 'ownerVerificationDocuments.status': 'pending' })
      .select('name email ownerVerificationDocuments ownerVerificationStatus');

    const pendingDocs = owners.flatMap((owner) =>
      (owner.ownerVerificationDocuments || [])
        .filter((doc) => doc.status === 'pending')
        .map((doc) => ({
          ownerId: owner._id,
          ownerName: owner.name,
          ownerEmail: owner.email,
          ownerVerificationStatus: owner.ownerVerificationStatus,
          documentId: doc._id,
          docType: doc.docType,
          imageUrl: doc.imageUrl,
          uploadedAt: doc.uploadedAt,
        }))
    );

    res.json(pendingDocs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending KYC documents' });
  }
});

router.put('/admin/owner-requests/:id/documents/:docId', protect, adminOnly, async (req, res) => {
  try {
    const { status, rejectReason = '' } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid document review status' });
    }

    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ error: 'Owner not found' });

    const doc = owner.ownerVerificationDocuments?.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    doc.status = status;
    doc.rejectReason = status === 'rejected' ? String(rejectReason || 'Invalid or unclear document') : '';
    doc.reviewedAt = new Date();

    const pendingCount = owner.ownerVerificationDocuments.filter((d) => d.status === 'pending').length;
    const rejectedCount = owner.ownerVerificationDocuments.filter((d) => d.status === 'rejected').length;

    if (pendingCount === 0 && rejectedCount === 0) {
      owner.ownerVerificationStatus = 'verified';
      owner.ownerVerifiedAt = new Date();
      owner.ownerVerificationRejectReason = '';
    } else if (status === 'rejected') {
      owner.ownerVerificationStatus = 'rejected';
      owner.ownerVerificationRejectReason = doc.rejectReason;
    } else if (owner.ownerVerificationStatus !== 'verified') {
      owner.ownerVerificationStatus = 'pending';
    }

    await owner.save();
    res.json({ message: 'Document review updated', owner });
  } catch (err) {
    console.error('owner document review error:', err);
    res.status(500).json({ error: 'Failed to update document review' });
  }
});

router.put('/admin/owner-requests/:id', protect, adminOnly, async (req, res) => {
  try {
    const { status, rejectReason = '' } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ error: 'Owner not found' });

    owner.ownerVerificationStatus = status;
    owner.ownerVerifiedAt = status === 'verified' ? new Date() : null;
    owner.ownerVerificationRejectReason = status === 'rejected' ? String(rejectReason || 'Verification rejected') : '';

    owner.ownerVerificationDocuments = (owner.ownerVerificationDocuments || []).map((doc) => {
      if (doc.status === 'pending') {
        return {
          ...doc.toObject(),
          status,
          rejectReason: status === 'rejected' ? owner.ownerVerificationRejectReason : '',
          reviewedAt: new Date(),
        };
      }
      return doc;
    });
    await owner.save();

    try {
      await sendNotification(
        owner._id,
        'ownerVerification',
        `Your verification was ${status}.${status === 'rejected' ? ` Reason: ${owner.ownerVerificationRejectReason}` : ''}`,
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
