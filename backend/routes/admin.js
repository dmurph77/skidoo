const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const WeeklyPick = require('../models/WeeklyPick');
const { WeekConfig, Game, Invite } = require('../models/Season');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendInviteEmail, sendPicksOpenEmail, sendResultsEmail, sendDeadlineReminderEmail } = require('../utils/email');
const { autoScoreWeek } = require('../jobs/autoScore');
const { runRandy } = require('../jobs/scheduler');
const { PICKS_PER_WEEK } = require('../utils/teams');

router.use(authenticate, requireAdmin);
const SEASON = () => parseInt(process.env.CURRENT_SEASON || '2026');

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const season = SEASON();
    const [users, weeks, invites] = await Promise.all([
      User.find({ isActive: true }).select('displayName username emailVerified hasPaid seasonPoints usedTeams createdAt'),
      WeekConfig.find({ season }).sort({ week: 1 }),
      Invite.find({ isUsed: false, expiresAt: { $gt: new Date() } }).countDocuments(),
    ]);

    const openWeek = weeks.find(w => w.isOpen);
    const latestScored = [...weeks].reverse().find(w => w.isScored);

    // Who hasn't submitted for open week
    let missingPlayers = [];
    if (openWeek) {
      const submitted = await WeeklyPick.find({ season, week: openWeek.week }).select('user');
      const submittedIds = new Set(submitted.map(s => s.user.toString()));
      missingPlayers = users
        .filter(u => u.emailVerified && !submittedIds.has(u._id.toString()))
        .map(u => ({ _id: u._id, displayName: u.displayName, username: u.username }));
    }

    res.json({
      stats: {
        totalPlayers: users.filter(u => u.emailVerified).length,
        pendingVerification: users.filter(u => !u.emailVerified).length,
        paidPlayers: users.filter(u => u.hasPaid).length,
        activeInvites: invites,
        openWeek: openWeek?.week || null,
        latestScoredWeek: latestScored?.week || null,
        seasonPot: users.filter(u => u.hasPaid).length * 70,
        weeklyPot: 70 + (openWeek?.rolloverAmount || latestScored?.rolloverAmount || 0),
        rolloverAmount: openWeek?.rolloverAmount || latestScored?.rolloverAmount || 0,
      },
      missingPlayers,
      weeks,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── INVITES ────────────────────────────────────────────────────────────────────
router.post('/invites', async (req, res) => {
  try {
    const { email, expiresInDays = 7 } = req.body;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const invite = new Invite({
      token, expiresAt,
      email: email?.toLowerCase() || null,
      createdBy: req.user._id,
    });
    await invite.save();

    const inviteUrl = `${process.env.FRONTEND_URL}/register?invite=${token}`;

    if (email) {
      try {
        await sendInviteEmail(email, req.user.displayName, token, expiresInDays);
      } catch (e) {
        console.error('Invite email failed:', e.message);
      }
    }

    res.json({ invite, inviteUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/invites', async (req, res) => {
  const invites = await Invite.find()
    .populate('createdBy', 'displayName')
    .populate('usedBy', 'displayName username')
    .sort({ createdAt: -1 });
  res.json({ invites });
});

router.delete('/invites/:id', async (req, res) => {
  await Invite.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── WEEK MANAGEMENT ────────────────────────────────────────────────────────────
router.get('/weeks', async (req, res) => {
  const weeks = await WeekConfig.find({ season: SEASON() }).sort({ week: 1 });
  res.json({ weeks });
});

router.post('/weeks', async (req, res) => {
  try {
    const { week, label, deadline, picksRequired } = req.body;
    const w = parseInt(week);
    const config = await WeekConfig.findOneAndUpdate(
      { season: SEASON(), week: w },
      { label, deadline: new Date(deadline), picksRequired: picksRequired || PICKS_PER_WEEK[w] || 5 },
      { upsert: true, new: true }
    );
    res.json({ weekConfig: config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Open a week (and email all players)
router.post('/weeks/:week/open', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();
    const config = await WeekConfig.findOne({ season, week });
    if (!config) return res.status(404).json({ error: 'Week not configured' });

    config.isOpen = true;
    await config.save();

    const weekLabel = week === 1 ? 'Week 0/1' : `Week ${week}`;

    // Fetch games for this week to include in email
    const { Game } = require('../models/Season');
    const weekGames = await Game.find({ season, week }).sort({ gameDate: 1 }).limit(30);

    // Email all verified active players
    const users = await User.find({ isActive: true, emailVerified: true });
    let emailsSent = 0;
    for (const u of users) {
      try {
        await sendPicksOpenEmail(u.email, u.displayName, weekLabel, config.deadline, weekGames);
        emailsSent++;
        await sleep(80); // stagger
      } catch (e) { /* continue */ }
    }

    res.json({ success: true, weekConfig: config, emailsSent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/weeks/:week/close', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();

    const config = await WeekConfig.findOneAndUpdate(
      { season, week },
      { isOpen: false },
      { new: true }
    );
    if (!config) return res.status(404).json({ error: 'Week not configured' });

    // Run Randy for all players who haven't submitted — same as deadline cron
    let randydCount = 0;
    try {
      const before = await WeeklyPick.countDocuments({ season, week, wasRandyd: true });
      await runRandy(config);
      const after = await WeeklyPick.countDocuments({ season, week, wasRandyd: true });
      randydCount = after - before;
    } catch (randyErr) {
      console.error('Randy failed during manual close:', randyErr.message);
    }

    res.json({ success: true, weekConfig: config, randydCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send manual reminder to players who haven't submitted
router.post('/weeks/:week/remind', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();
    const config = await WeekConfig.findOne({ season, week });
    if (!config) return res.status(404).json({ error: 'Week not configured' });

    const submitted = await WeeklyPick.find({ season, week }).select('user');
    const submittedIds = new Set(submitted.map(s => s.user.toString()));

    const missing = await User.find({ isActive: true, emailVerified: true });
    const toRemind = missing.filter(u => !submittedIds.has(u._id.toString()));

    const weekLabel = week === 1 ? 'Week 0/1' : `Week ${week}`;
    let sent = 0;
    for (const u of toRemind) {
      try {
        await sendDeadlineReminderEmail(u.email, u.displayName, weekLabel, config.deadline);
        sent++;
      } catch (e) { /* continue */ }
    }

    res.json({ success: true, sent, total: toRemind.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save commissioner notes for a week
router.patch('/weeks/:week/notes', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const { notes } = req.body;
    const config = await WeekConfig.findOneAndUpdate(
      { season: SEASON(), week },
      { notes: notes || '' },
      { new: true }
    );
    if (!config) return res.status(404).json({ error: 'Week not configured' });
    res.json({ success: true, weekConfig: config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SCORING ────────────────────────────────────────────────────────────────────
// Get all submissions for a week (for review screen)
router.get('/scoring/:week', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();

    const [submissions, weekConfig, games] = await Promise.all([
      WeeklyPick.find({ season, week })
        .populate('user', 'displayName username avatarUrl')
        .sort({ totalPoints: -1 }),
      WeekConfig.findOne({ season, week }),
      Game.find({ season, week }),
    ]);

    // Who hasn't submitted
    const verifiedUsers = await User.find({ isActive: true, emailVerified: true }).select('_id displayName username');
    const submittedIds = new Set(submissions.map(s => s.user._id.toString()));
    const missing = verifiedUsers.filter(u => !submittedIds.has(u._id.toString()));

    res.json({ submissions, weekConfig, games, missingPlayers: missing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh scores from CFBD
router.post('/scoring/:week/refresh', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();
    const result = await autoScoreWeek(season, week);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Override a single pick result
router.patch('/scoring/:week/pick', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const { submissionId, pickIndex, result } = req.body;
    const season = SEASON();

    const sub = await WeeklyPick.findById(submissionId);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    if (sub.isLocked) return res.status(400).json({ error: 'Week is finalized' });

    const ptMap = { correct: sub.picks[pickIndex].pickType === 'win_vs_power4' ? 1 : 2, incorrect: 0, pending: 0 };
    sub.picks[pickIndex].result = result;
    sub.picks[pickIndex].pointsEarned = ptMap[result] ?? 0;
    sub.recalcTotal();
    await sub.save();

    res.json({ success: true, submission: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Finalize a week — lock scores, update season totals, determine winners
router.post('/scoring/:week/finalize', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();

    const weekConfig = await WeekConfig.findOne({ season, week });
    if (!weekConfig) return res.status(404).json({ error: 'Week not found' });

    let submissions = await WeeklyPick.find({ season, week }).populate('user');

    // If nobody has submitted yet, run Randy first so everyone gets picks + email
    if (submissions.length === 0) {
      try {
        await runRandy(weekConfig);
      } catch (randyErr) {
        console.error('Randy failed during finalize:', randyErr.message);
      }
    }

    // Score any un-scored picks (Randy submissions created after refresh-from-ESPN
    // never get pre-populated by autoScore — run it now so Randy picks have results)
    try {
      await autoScoreWeek(season, week);
    } catch (scoreErr) {
      console.error('autoScoreWeek during finalize failed:', scoreErr.message);
    }

    // Re-fetch submissions (captures Randy's new ones + fresh scores)
    submissions = await WeeklyPick.find({ season, week }).populate('user');

    // Sort by points, tiebreak by upset picks made (season tiebreaker rule)
    const upsetCount = (sub) => sub.picks.filter(p => p.pickType === 'upset_loss').length;
    const sorted = [...submissions].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return upsetCount(b) - upsetCount(a); // tiebreak: more upset picks wins
    });
    const maxPts = sorted[0]?.totalPoints || 0;
    const maxUpsets = upsetCount(sorted[0]);
    // Winners: same points AND same upset count (true tie → split/rollover)
    const winners = sorted.filter(s => s.totalPoints === maxPts && upsetCount(s) === maxUpsets);

    const pot = weekConfig.weeklyPot + (weekConfig.rolloverAmount || 0);
    let payout = 0;
    let rollover = false;

    if (winners.length === 1) {
      payout = pot;
    } else if (winners.length === 2) {
      payout = pot / 2;
    } else {
      // 3+ tie → rollover to next week
      rollover = true;
      const nextWeek = await WeekConfig.findOne({ season, week: week + 1 });
      if (nextWeek) {
        nextWeek.rolloverAmount = (nextWeek.rolloverAmount || 0) + pot;
        await nextWeek.save();
      }
    }

    // Lock all submissions + set week rank
    let rank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].totalPoints < sorted[i - 1].totalPoints) rank = i + 1;
      sorted[i].isScored = true;
      sorted[i].isLocked = true;
      sorted[i].weekRank = rank;
      await sorted[i].save();
    }

    // Update each user's season totals
    for (const sub of submissions) {
      const user = await User.findById(sub.user._id);
      const weekIdx = (user.weeklyPoints || []).findIndex(w => w.week === week);
      if (weekIdx >= 0) {
        user.weeklyPoints[weekIdx].points = sub.totalPoints;
        user.weeklyPoints[weekIdx].rank = sub.weekRank;
      } else {
        user.weeklyPoints = [...(user.weeklyPoints || []), { week, points: sub.totalPoints, rank: sub.weekRank }];
      }
      user.seasonPoints = user.weeklyPoints.reduce((s, w) => s + w.points, 0);
      await user.save();
    }

    // Determine biggest upset (upset_loss pick that was correct)
    let biggestUpset = '';
    for (const sub of submissions) {
      for (const p of sub.picks) {
        if (p.pickType === 'upset_loss' && p.result === 'correct') {
          biggestUpset = p.team;
        }
      }
    }

    // Save week config recap
    weekConfig.isScored = true;
    weekConfig.isOpen = false;
    weekConfig.weeklyWinners = winners.map(w => ({
      userId: w.user._id,
      points: w.totalPoints,
      payout: rollover ? 0 : payout,
    }));
    weekConfig.recap.winnerId = rollover ? null : winners[0]?.user._id;
    weekConfig.recap.winnerPoints = maxPts;
    weekConfig.recap.biggestUpset = biggestUpset;
    weekConfig.recap.highScore = maxPts;
    await weekConfig.save();

    // Email results to all players
    const weekLabel = week === 1 ? 'Week 0/1' : `Week ${week}`;
    const allUsers = await User.find({ isActive: true, emailVerified: true }).sort({ seasonPoints: -1 }).select('displayName seasonPoints');
    const standings = allUsers.map((u, i) => ({ displayName: u.displayName, seasonPoints: u.seasonPoints, rank: i + 1 }));
    for (const sub of submissions) {
      try {
        const weekRank = sub.weekRank;
        const seasonRank = standings.findIndex(u => u.displayName === sub.user.displayName) + 1;
        await sendResultsEmail(sub.user.email, sub.user.displayName, weekLabel, sub.totalPoints, weekRank, seasonRank || 1, standings);
        await sleep(80); // stagger — prevents Gmail rate limiting at 50 players
      } catch (e) { /* continue */ }
    }

    res.json({
      success: true,
      winners: winners.map(w => ({ displayName: w.user.displayName, points: w.totalPoints })),
      payout: rollover ? 0 : payout,
      rollover,
      biggestUpset,
      weekLabel,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── USERS ──────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const users = await User.find().select('-password -emailVerifyToken').sort({ createdAt: 1 });
  res.json({ users });
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { isActive, isAdmin, hasPaid, displayName } = req.body;
    const updates = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;
    if (hasPaid !== undefined) updates.hasPaid = hasPaid;
    if (displayName) updates.displayName = displayName;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit a player's picks (commissioner override)
router.patch('/users/:userId/picks/:week', async (req, res) => {
  try {
    const { picks } = req.body;
    const week = parseInt(req.params.week);
    const season = SEASON();

    const sub = await WeeklyPick.findOne({ user: req.params.userId, season, week });
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    if (sub.isLocked) return res.status(400).json({ error: 'Week is finalized — cannot edit' });

    sub.picks = picks;
    sub.recalcTotal();
    sub.lastModifiedAt = new Date();
    await sub.save();

    res.json({ success: true, submission: sub });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── COMMISSIONER POINT ADJUSTMENT ─────────────────────────────────────────────
router.post('/users/:userId/adjust-points', async (req, res) => {
  try {
    const { week, delta, reason } = req.body;
    const season = SEASON();
    const w = parseInt(week);

    if (!delta || delta === 0) return res.status(400).json({ error: 'Delta required' });

    // Find or create a submission record for this week
    let sub = await WeeklyPick.findOne({ user: req.params.userId, season, week: w });
    if (!sub) {
      // Create a placeholder submission to attach adjustment to
      sub = new WeeklyPick({
        user: req.params.userId, season, week: w, picks: [],
        isScored: true, isLocked: true,
      });
    }

    sub.commissionerAdjustments = sub.commissionerAdjustments || [];
    sub.commissionerAdjustments.push({ delta: parseFloat(delta), reason: reason || '', byAdmin: req.user._id });
    sub.recalcTotal();
    await sub.save();

    // Recalculate user season total from all weeks
    const allSubs = await WeeklyPick.find({ user: req.params.userId, season });
    const user = await User.findById(req.params.userId);

    // Rebuild weeklyPoints
    for (const s of allSubs) {
      const idx = (user.weeklyPoints || []).findIndex(wp => wp.week === s.week);
      if (idx >= 0) {
        user.weeklyPoints[idx].points = s.totalPoints;
      } else {
        user.weeklyPoints = [...(user.weeklyPoints || []), { week: s.week, points: s.totalPoints, rank: s.weekRank }];
      }
    }
    user.seasonPoints = (user.weeklyPoints || []).reduce((sum, w) => sum + w.points, 0);
    await user.save();

    res.json({ success: true, newTotal: sub.totalPoints, seasonPoints: user.seasonPoints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RE-SCORE A WEEK (full recalc) ──────────────────────────────────────────────
router.post('/scoring/:week/rescore', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();

    const weekConfig = await WeekConfig.findOne({ season, week });
    if (!weekConfig) return res.status(404).json({ error: 'Week not found' });

    // 1. Re-fetch scores from CFBD
    const { autoScoreWeek } = require('../jobs/autoScore');
    await autoScoreWeek(season, week);

    // 2. Unlock submissions so we can re-finalize
    await WeeklyPick.updateMany({ season, week }, { isLocked: false, isScored: false });

    // 3. Re-finalize (reuse finalize logic inline)
    const submissions = await WeeklyPick.find({ season, week }).populate('user');
    const sorted = [...submissions].sort((a, b) => b.totalPoints - a.totalPoints);
    const maxPts = sorted[0]?.totalPoints || 0;
    const winners = sorted.filter(s => s.totalPoints === maxPts);

    const pot = weekConfig.weeklyPot + (weekConfig.rolloverAmount || 0);
    let payout = 0;
    let rollover = false;
    if (winners.length === 1) { payout = pot; }
    else if (winners.length === 2) { payout = pot / 2; }
    else { rollover = true; }

    let rank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].totalPoints < sorted[i - 1].totalPoints) rank = i + 1;
      sorted[i].isScored = true;
      sorted[i].isLocked = true;
      sorted[i].weekRank = rank;
      await sorted[i].save();
    }

    // 4. Full season recalc for ALL users
    const allUsers = await User.find({ isActive: true });
    for (const user of allUsers) {
      const allSubs = await WeeklyPick.find({ user: user._id, season, isScored: true });
      user.weeklyPoints = allSubs.map(s => ({ week: s.week, points: s.totalPoints, rank: s.weekRank }));
      user.seasonPoints = user.weeklyPoints.reduce((sum, w) => sum + w.points, 0);
      await user.save();
    }

    weekConfig.isScored = true;
    weekConfig.isOpen = false;
    weekConfig.weeklyWinners = winners.map(w => ({
      userId: w.user._id, points: w.totalPoints, payout: rollover ? 0 : payout,
    }));
    await weekConfig.save();

    res.json({ success: true, message: `Week ${week} re-scored. Full season standings recalculated.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RESET USER EMAIL ───────────────────────────────────────────────────────────
router.patch('/users/:id/email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.params.id } });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { email: email.toLowerCase(), emailVerified: false },
      { new: true }
    ).select('-password');

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/health ─ system health panel ────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    const season = SEASON();
    const now = new Date();

    const weeks = await WeekConfig.find({ season }).sort({ week: -1 });
    const openWeek = weeks.find(w => w.isOpen);
    const lastScored = weeks.find(w => w.isScored);

    // Last Randy run: find most recent week that has randydPlayers
    const lastRandyWeek = weeks.find(w => w.recap?.randydPlayers?.length > 0);

    // Last finalized week has a finalizedAt timestamp if we store it — use deadline as proxy
    const lastFinalizedWeek = weeks.find(w => w.isScored);

    // Count Randy'd players this season
    const totalRandyd = await WeeklyPick.countDocuments({ season, wasRandyd: true });

    // Check for any weeks that are past deadline but not yet processed (Randy not run)
    const stuck = weeks.filter(w => {
      if (!w.isOpen || w.isScored) return false;
      if (!w.deadline) return false;
      return new Date(w.deadline) < now;
    });

    // Email activity proxy: check last results email by looking at last scored week
    const users = await User.countDocuments({ isActive: true, emailVerified: true });

    res.json({
      timestamp: now.toISOString(),
      season,
      openWeek: openWeek ? {
        week: openWeek.week,
        deadline: openWeek.deadline,
        hoursUntilDeadline: openWeek.deadline
          ? Math.round((new Date(openWeek.deadline) - now) / 3600000 * 10) / 10
          : null,
        isOpen: true,
      } : null,
      lastScored: lastScored ? {
        week: lastScored.week,
        deadline: lastScored.deadline,
      } : null,
      randy: {
        lastRunWeek: lastRandyWeek?.week || null,
        totalRandydThisSeason: totalRandyd,
        lastRandydCount: lastRandyWeek?.recap?.randydPlayers?.length || 0,
      },
      stuckWeeks: stuck.map(w => ({ week: w.week, deadline: w.deadline })),
      activePlayers: users,
      weeksConfigured: weeks.length,
      weeksScored: weeks.filter(w => w.isScored).length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── POST /admin/scoring/:week/manual-results ──────────────────────────────────
// Commissioner manually enters game winners when ESPN/CFBD API is unavailable.
// Body: { results: [{ gameId, homeWon }] }  (homeWon: true | false | null for tie)
// After saving, re-runs the pick scoring logic identically to the auto-score path.
router.post('/scoring/:week/manual-results', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();
    const { results } = req.body; // [{ gameId, homeWon }]

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'results array required' });
    }

    // Update each game document
    let updated = 0;
    for (const { gameId, homeWon } of results) {
      const g = await Game.findOne({ _id: gameId, season, week });
      if (!g) continue;
      g.homeWon = homeWon; // true = home won, false = away won, null = tie
      // Set placeholder scores so autoScoreWeek recognises it as completed
      if (homeWon === true)  { g.homeScore = 1; g.awayScore = 0; }
      else if (homeWon === false) { g.homeScore = 0; g.awayScore = 1; }
      else { g.homeScore = 0; g.awayScore = 0; } // tie
      await g.save();
      updated++;
    }

    // Now re-run pick scoring using the same logic as the ESPN refresh
    const { autoScoreWeek } = require('../jobs/autoScore');
    const scoreResult = await autoScoreWeek(season, week);

    res.json({ success: true, gamesUpdated: updated, ...scoreResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
