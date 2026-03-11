const express = require('express');
const router  = express.Router();
const { ChatMessage } = require('../models/Season');
const User = require('../models/User');
const { authenticate, requireVerified } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// Helper exported for use in admin routes
// ─────────────────────────────────────────────────────────────────────────────
async function postSystemMessage(message, systemType) {
  try {
    const msg = new ChatMessage({ message, isSystem: true, systemType });
    await msg.save();
    return msg;
  } catch (e) {
    console.error('[chat] system message failed:', e.message);
  }
}
module.exports.postSystemMessage = postSystemMessage;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat  — top-level messages with reply counts
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 60, 100);
    const query = { parentId: null };
    if (req.query.before) {
      const anchor = await ChatMessage.findById(req.query.before);
      if (anchor) query.createdAt = { $lt: anchor.createdAt };
    }

    const messages = await ChatMessage.find(query)
      .populate('user', 'displayName username avatarUrl')
      .populate('mentions', 'displayName username')
      .sort({ createdAt: -1 })
      .limit(limit);

    const reversed = messages.reverse();

    // Attach reply counts in one aggregation
    const ids = reversed.map(m => m._id);
    const counts = await ChatMessage.aggregate([
      { $match: { parentId: { $in: ids } } },
      { $group: { _id: '$parentId', count: { $sum: 1 } } },
    ]);
    const rcMap = {};
    counts.forEach(r => { rcMap[r._id.toString()] = r.count; });

    const result = reversed.map(m => ({
      ...m.toObject(),
      replyCount: rcMap[m._id.toString()] || 0,
    }));

    res.json({ messages: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/unread — count messages since user last visited chat
// ─────────────────────────────────────────────────────────────────────────────
router.get('/unread', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('chatLastSeen');
    const since = user?.chatLastSeen || new Date(0);
    // Count top-level messages not posted by this user since last seen
    const count = await ChatMessage.countDocuments({
      parentId: null,
      createdAt: { $gt: since },
      $or: [{ user: { $ne: req.user._id } }, { isSystem: true }],
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/seen — mark chat as read up to now
// ─────────────────────────────────────────────────────────────────────────────
router.post('/seen', authenticate, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { chatLastSeen: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/members — user list for @ autocomplete
// ─────────────────────────────────────────────────────────────────────────────
router.get('/members', authenticate, async (req, res) => {
  try {
    const users = await User.find({ isActive: true, emailVerified: true })
      .select('displayName username _id')
      .sort({ displayName: 1 });
    res.json({ members: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/replies/:parentId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/replies/:parentId', authenticate, async (req, res) => {
  try {
    const replies = await ChatMessage.find({ parentId: req.params.parentId })
      .populate('user', 'displayName username avatarUrl')
      .populate('mentions', 'displayName username')
      .sort({ createdAt: 1 });
    res.json({ replies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat — send a message (or reply)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authenticate, requireVerified, async (req, res) => {
  try {
    const { message, parentId, mentionIds } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
    if (message.length > 1000) return res.status(400).json({ error: 'Max 1000 characters' });

    if (parentId) {
      const parent = await ChatMessage.findById(parentId);
      if (!parent) return res.status(404).json({ error: 'Parent not found' });
      // Only one level of threading
      if (parent.parentId) return res.status(400).json({ error: 'Cannot reply to a reply' });
    }

    const msg = new ChatMessage({
      user:     req.user._id,
      message:  message.trim(),
      parentId: parentId || null,
      mentions: mentionIds || [],
    });
    await msg.save();
    await msg.populate('user', 'displayName username avatarUrl');
    await msg.populate('mentions', 'displayName username');

    res.json({ message: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/chat/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (!req.user.isAdmin && msg.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    // Cascade delete replies when deleting a parent
    if (!msg.parentId) await ChatMessage.deleteMany({ parentId: msg._id });
    await msg.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/:id/like
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });

    const uid = req.user._id.toString();
    const already = msg.likes.map(l => l.toString()).includes(uid);
    if (already) msg.likes = msg.likes.filter(l => l.toString() !== uid);
    else msg.likes.push(req.user._id);
    await msg.save();

    res.json({ likes: msg.likes.length, liked: !already });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
