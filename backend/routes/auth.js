const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { Invite } = require('../models/Season');
const { authenticate } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const sign = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName, inviteToken } = req.body;

    if (!username || !email || !password || !displayName || !inviteToken) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });

    // Validate invite
    const invite = await Invite.findOne({
      token: inviteToken,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });
    if (!invite) return res.status(400).json({ error: 'Invalid or expired invite link' });
    if (invite.email && invite.email !== email.toLowerCase()) {
      return res.status(400).json({ error: 'This invite was sent to a different email address' });
    }

    // Check duplicates
    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existing) {
      return res.status(400).json({
        error: existing.email === email.toLowerCase() ? 'Email already registered' : 'Username taken'
      });
    }

    // Create email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const user = new User({
      username, email, password, displayName,
      invitedBy: invite.createdBy,
      emailVerifyToken: verifyToken,
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await user.save();

    // Mark invite used
    invite.isUsed = true;
    invite.usedBy = user._id;
    await invite.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, displayName, verifyToken);
    } catch (e) {
      console.error('Verification email failed:', e.message);
    }

    const token = sign(user._id);
    res.status(201).json({ token, user: user.toJSON() });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email or username already taken' });
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    user.lastLoginAt = new Date();
    await user.save();

    const token = sign(user._id);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user.toJSON() });
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({
      emailVerifyToken: token,
      emailVerifyExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });

    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified!' });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', authenticate, async (req, res) => {
  try {
    if (req.user.emailVerified) return res.json({ success: true, message: 'Already verified' });

    const token = crypto.randomBytes(32).toString('hex');
    await User.findByIdAndUpdate(req.user._id, {
      emailVerifyToken: token,
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await sendVerificationEmail(req.user.email, req.user.displayName, token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend' });
  }
});

// POST /api/auth/validate-invite
router.post('/validate-invite', async (req, res) => {
  const { token } = req.body;
  const invite = await Invite.findOne({ token, isUsed: false, expiresAt: { $gt: new Date() } });
  res.json({ valid: !!invite, email: invite?.email || null });
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const { displayName } = req.body;
    const updates = {};
    if (displayName?.trim()) updates.displayName = displayName.trim().slice(0, 40);
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always return success — don't leak whether email exists
    if (!user) return res.json({ success: true });

    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await sendPasswordResetEmail(user.email, user.displayName, token);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired' });

    user.password = password; // model handles hashing
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
