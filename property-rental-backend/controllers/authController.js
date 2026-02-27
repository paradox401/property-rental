import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import axios from 'axios';

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || '1d';
const REFRESH_TOKEN_TTL_DAYS = Math.max(1, Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14));

const toPublicUser = (user) => ({
  _id: user._id,
  email: user.email,
  role: user.role,
  name: user.name,
  ownerVerificationStatus: user.ownerVerificationStatus,
});

const issueSessionTokens = async (user) => {
  const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Persist session token material without re-validating the full user document.
  // This avoids login failures for legacy records that may not satisfy newer validators.
  await User.updateOne(
    { _id: user._id },
    {
      $set: { refreshTokenHash, refreshTokenExpiresAt },
    }
  );

  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  try {
    const { name, citizenshipNumber, email, password, role } = req.body;

    if (!name || !citizenshipNumber || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (role && !['owner', 'renter'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      citizenshipNumber,
      email,
      password: hashedPassword,
      role: role || 'renter',
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email, role });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const { accessToken, refreshToken } = await issueSessionTokens(user);

    res.json({
      token: accessToken,
      refreshToken,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const rawRefreshToken = String(req.body?.refreshToken || '').trim();
    if (!rawRefreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const user = await User.findOne({
      refreshTokenHash,
      refreshTokenExpiresAt: { $gt: new Date() },
    }).select('-password +refreshTokenHash +refreshTokenExpiresAt');
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    if (user.isActive === false) {
      return res.status(403).json({ error: 'Account is disabled. Contact support.' });
    }

    const session = await issueSessionTokens(user);
    return res.json({
      token: session.accessToken,
      refreshToken: session.refreshToken,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error('refreshToken error:', err);
    return res.status(500).json({ error: 'Failed to refresh session' });
  }
};

export const logout = async (req, res) => {
  try {
    const rawRefreshToken = String(req.body?.refreshToken || '').trim();
    if (!rawRefreshToken) {
      return res.json({ success: true });
    }
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    await User.findOneAndUpdate(
      { refreshTokenHash },
      {
        $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 },
      }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('logout error:', err);
    return res.status(500).json({ error: 'Failed to logout' });
  }
};

const createMailerTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

const sendResetPasswordEmail = async (toEmail, resetUrl) => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    const senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!senderEmail) {
      throw new Error('Missing SMTP_FROM or SMTP_USER for Brevo sender email');
    }
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { email: senderEmail },
        to: [{ email: toEmail }],
        subject: 'Reset your Property Rental password',
        textContent: `Reset your password using this link: ${resetUrl}\nThis link expires in 15 minutes.`,
        htmlContent: `
          <p>We received a request to reset your password.</p>
          <p><a href="${resetUrl}">Click here to reset password</a></p>
          <p>This link expires in 15 minutes.</p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
      },
      {
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    return true;
  }

  const transporter = createMailerTransport();
  if (!transporter) {
    console.log(`[Password Reset] SMTP not configured. Reset link for ${toEmail}: ${resetUrl}`);
    return false;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: 'Reset your Property Rental password',
    text: `Reset your password using this link: ${resetUrl}\nThis link expires in 15 minutes.`,
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to reset password</a></p>
      <p>This link expires in 15 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });

  return true;
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordTokenHash = resetTokenHash;
    user.resetPasswordExpiresAt = resetPasswordExpiresAt;
    await user.save();

    const baseUrl =
      process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

    let emailSent = false;
    try {
      emailSent = await sendResetPasswordEmail(user.email, resetUrl);
    } catch (mailErr) {
      // Do not fail forgot-password flow because of SMTP issues.
      console.error('forgotPassword mail send error:', mailErr.message);
    }

    return res.json({
      message: 'If an account with that email exists, a reset link has been sent.',
      ...(emailSent ? {} : { resetUrl }),
    });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ error: 'Failed to process forgot password request' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) return res.status(400).json({ error: 'Reset token is required' });
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    }).select('+resetPasswordTokenHash +resetPasswordExpiresAt');

    if (!user) {
      return res.status(400).json({ error: 'Reset link is invalid or expired' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    return res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
};
