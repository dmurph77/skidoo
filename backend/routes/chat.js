const express = require('express');
const router = express.Router();
const { ChatMessage } = require('../models/Season');
const { authenticate, requireVerified } = require('../middleware/auth');

// GET /api/chat?limit=50&before=<id>
router.get('/', authenticate, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const query = {};
    if (req.query.before) {
      const msg = await ChatMessage.findById(req.query.before);
      if (msg) query.createdAt = { $lt: msg.createdAt };
    }

    const messages = await ChatMessage.find(query)
      .populate('user', 'displayName username avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat
router.post('/', authenticate, requireVerified, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
    if (message.length > 500) return res.status(400).json({ error: 'Max 500 characters' });

    const msg = new ChatMessage({ user: req.user._id, message: message.trim() });
    await msg.save();
    await msg.populate('user', 'displayName username avatarUrl');

    res.json({ message: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/:id (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (!req.user.isAdmin && msg.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await msg.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/chat/:id/like — toggle like on a message
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });

    const uid = req.user._id.toString();
    const already = msg.likes.map(l => l.toString()).includes(uid);

    if (already) {
      msg.likes = msg.likes.filter(l => l.toString() !== uid);
    } else {
      msg.likes.push(req.user._id);
    }
    await msg.save();

    res.json({ likes: msg.likes.length, liked: !already });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
