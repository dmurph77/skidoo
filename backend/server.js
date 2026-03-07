require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { startCronJobs } = require('./jobs/scheduler');
const { startAutoScoreCron } = require('./jobs/autoScore');

const app = express();

// ── SECURITY ───────────────────────────────────────────────────────────────────
app.use(helmet());
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://skidoo.murphdunks.com',
  'https://skidoo-theta.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman in dev)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── LOGGING ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── BODY PARSING ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── RATE LIMITING ──────────────────────────────────────────────────────────────
// General: 300 req / 15 min per IP (covers normal heavy use)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false,
});
// Auth: 20 attempts / 15 min — stops brute-force login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts — try again in 15 minutes' },
});
// Pick submission: 30 submits / 15 min — stops accidental hammering
const picksLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Slow down — too many pick submissions' },
});
// Invite creation: 10 / hour — stops invite spam
const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many invites created — try again later' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/picks/week', picksLimiter);
app.use('/api/admin/invites', inviteLimiter);

// ── ROUTES ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/picks', require('./routes/picks'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat',  require('./routes/chat'));

// Health check
app.get('/health', (req, res) => res.json({
  status: 'ok',
  season: process.env.CURRENT_SEASON,
  timestamp: new Date().toISOString(),
}));

// ── ERROR HANDLER ──────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── START ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🏈 68 Ski-Doo API on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      if (process.env.NODE_ENV === 'production') {
        startCronJobs();
        startAutoScoreCron();
      }
    });
  })
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });

module.exports = app;
