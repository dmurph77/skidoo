const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WeeklyPick = require('../models/WeeklyPick');
const { WeekConfig, Game } = require('../models/Season');
const { authenticate, requireVerified } = require('../middleware/auth');
const { ALL_TEAMS, PICKS_PER_WEEK, isPower4, CONFERENCES } = require('../utils/teams');

const SEASON = () => parseInt(process.env.CURRENT_SEASON || '2026');

// ── GET /api/picks/current-week-status ─ for player dashboard CTA ─────────────
router.get('/current-week-status', authenticate, async (req, res) => {
  try {
    const season = SEASON();
    const openWeek = await WeekConfig.findOne({ season, isOpen: true });
    if (!openWeek) return res.json({ openWeek: null });

    const submission = await WeeklyPick.findOne({ user: req.user._id, season, week: openWeek.week });
    const hoursLeft = openWeek.deadline
      ? Math.max(0, (new Date(openWeek.deadline) - new Date()) / 3600000)
      : null;

    res.json({
      openWeek: {
        week: openWeek.week,
        label: openWeek.label || (openWeek.week === 1 ? 'Week 0/1' : `Week ${openWeek.week}`),
        deadline: openWeek.deadline,
        hoursLeft,
        picksRequired: openWeek.picksRequired || (openWeek.week <= 2 ? 4 : 5),
        notes: openWeek.notes || '',
      },
      submission: submission ? {
        submitted: true,
        picksCount: submission.picks.length,
        isLocked: submission.isLocked,
        wasRandyd: submission.wasRandyd,
      } : { submitted: false },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/picks/weeks ─ public week configs ────────────────────────────────
router.get('/weeks', async (req, res) => {
  try {
    const weeks = await WeekConfig.find({ season: SEASON() }).sort({ week: 1 });
    res.json({ weeks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/picks/available-teams ────────────────────────────────────────────
// Returns all 68 teams with availability flags for current user
router.get('/available-teams', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const usedSet = new Set(user.usedTeams || []);

    const teams = ALL_TEAMS.map(team => ({
      team,
      conference: Object.entries(CONFERENCES).find(([, ts]) => ts.includes(team))?.[0] || 'Unknown',
      available: !usedSet.has(team),
      used: usedSet.has(team),
    }));

    res.json({
      teams,
      usedCount: usedSet.size,
      remainingCount: ALL_TEAMS.length - usedSet.size,
      usedTeams: [...usedSet],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/picks/week/:week/games ─ game tiles with used-team status ────────
router.get('/week/:week/games', authenticate, async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();
    const user = await User.findById(req.user._id);
    const usedSet = new Set(user.usedTeams || []);

    // Exclude teams used in current week's existing submission (so edit works)
    const existing = await WeeklyPick.findOne({ user: req.user._id, season, week });
    const thisWeekTeams = new Set((existing?.picks || []).map(p => p.team));
    const effectiveUsed = new Set([...usedSet].filter(t => !thisWeekTeams.has(t)));

    const games = await Game.find({ season, week }).sort({ matchupType: 1, gameDate: 1 });

    // Only return games where at least one P4 team is available to pick
    const filtered = games.filter(g => {
      const homeAvail = g.homeIsPower4 && !effectiveUsed.has(g.homeTeam);
      const awayAvail = g.awayIsPower4 && !effectiveUsed.has(g.awayTeam);
      return homeAvail || awayAvail;
    });

    const result = filtered.map(g => ({
      _id: g._id,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeIsPower4: g.homeIsPower4,
      awayIsPower4: g.awayIsPower4,
      matchupType: g.matchupType,
      gameDate: g.gameDate,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      homeWon: g.homeWon,
      homeWinProb: g.homeWinProb,
      awayWinProb: g.awayWinProb,
      homeUsed: effectiveUsed.has(g.homeTeam),
      awayUsed: effectiveUsed.has(g.awayTeam),
    }));

    res.json({ games: result, week, totalAvailable: result.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/picks/week/:week/eligible ─ which teams can do what this week ────
router.get('/week/:week/eligible', authenticate, async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();
    const user = await User.findById(req.user._id);
    const usedSet = new Set(user.usedTeams || []);

    const games = await Game.find({ season, week });

    const winEligible = new Set();
    const upsetEligible = new Set();

    for (const g of games) {
      if (g.matchupType === 'p4_vs_p4') {
        winEligible.add(g.homeTeam);
        winEligible.add(g.awayTeam);
      } else if (g.matchupType === 'p4_vs_nonp4') {
        winEligible.add(g.homeTeam);
        upsetEligible.add(g.homeTeam);
      } else if (g.matchupType === 'nonp4_vs_p4') {
        winEligible.add(g.awayTeam);
        upsetEligible.add(g.awayTeam);
      }
    }

    const result = ALL_TEAMS.map(team => ({
      team,
      conference: Object.entries(CONFERENCES).find(([, ts]) => ts.includes(team))?.[0] || 'Unknown',
      used: usedSet.has(team),
      canPickWin: winEligible.has(team) && !usedSet.has(team),
      canPickUpset: upsetEligible.has(team) && !usedSet.has(team),
      hasGame: winEligible.has(team) || upsetEligible.has(team),
    }));

    res.json({ teams: result, week });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/picks/week/:week ──────────────────────────────────────────────────
router.get('/week/:week', authenticate, async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();

    const [weekConfig, submission] = await Promise.all([
      WeekConfig.findOne({ season, week }),
      WeeklyPick.findOne({ user: req.user._id, season, week }),
    ]);

    res.json({
      weekConfig,
      submission,
      picksRequired: PICKS_PER_WEEK[week] || 5,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/picks/week/:week ─ submit or update picks ───────────────────────
router.post('/week/:week', authenticate, requireVerified, async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();
    const { picks } = req.body; // [{ team, pickType }]

    // Week must be open and before deadline
    const weekConfig = await WeekConfig.findOne({ season, week });
    if (!weekConfig) return res.status(400).json({ error: 'Week not configured' });
    if (!weekConfig.isOpen) return res.status(400).json({ error: 'Picks are not open for this week' });
    if (new Date() > weekConfig.deadline) return res.status(400).json({ error: 'Deadline has passed' });

    // Check existing submission
    const existing = await WeeklyPick.findOne({ user: req.user._id, season, week });
    if (existing?.isLocked) return res.status(400).json({ error: 'Your picks are locked' });

    // Validate pick count
    const required = PICKS_PER_WEEK[week] || 5;
    if (!Array.isArray(picks) || picks.length !== required) {
      return res.status(400).json({ error: `Week ${week} requires exactly ${required} picks` });
    }

    // Load user's used teams (excluding what they submitted this week, so edits work)
    const user = await User.findById(req.user._id);
    let usedSet = new Set(user.usedTeams || []);

    // If editing, remove this week's previous picks from the used set
    if (existing) {
      for (const p of existing.picks) usedSet.delete(p.team);
    }

    // Load eligible teams for this week
    const games = await Game.find({ season, week });
    const winEligible = new Set();
    const upsetEligible = new Set();
    for (const g of games) {
      if (g.matchupType === 'p4_vs_p4') { winEligible.add(g.homeTeam); winEligible.add(g.awayTeam); }
      else if (g.matchupType === 'p4_vs_nonp4') { winEligible.add(g.homeTeam); upsetEligible.add(g.homeTeam); }
      else if (g.matchupType === 'nonp4_vs_p4') { winEligible.add(g.awayTeam); upsetEligible.add(g.awayTeam); }
    }

    // Validate each pick
    const pickedThisWeek = new Set();
    for (const pick of picks) {
      if (!ALL_TEAMS.includes(pick.team)) {
        return res.status(400).json({ error: `${pick.team} is not a valid team` });
      }
      if (!['win_vs_power4', 'upset_loss'].includes(pick.pickType)) {
        return res.status(400).json({ error: `Invalid pick type for ${pick.team}` });
      }
      if (usedSet.has(pick.team)) {
        return res.status(400).json({ error: `You've already used ${pick.team} this season` });
      }
      if (pickedThisWeek.has(pick.team)) {
        return res.status(400).json({ error: `${pick.team} can only appear once in your picks` });
      }
      if (pick.pickType === 'upset_loss' && !upsetEligible.has(pick.team)) {
        return res.status(400).json({ error: `${pick.team} is not playing a non-Power 4 opponent this week` });
      }
      if (pick.pickType === 'win_vs_power4' && !winEligible.has(pick.team)) {
        return res.status(400).json({ error: `${pick.team} does not have an eligible win matchup this week` });
      }
      pickedThisWeek.add(pick.team);
    }

    // Build picks array
    const picksData = picks.map(p => ({
      team: p.team,
      pickType: p.pickType,
      result: 'pending',
      pointsEarned: 0,
    }));

    // Upsert submission
    await WeeklyPick.findOneAndUpdate(
      { user: req.user._id, season, week },
      { picks: picksData, wasRandyd: false, lastModifiedAt: new Date(), totalPoints: 0 },
      { upsert: true, new: true }
    );

    // Update user's used teams
    const allUsed = [...new Set([...user.usedTeams || [], ...picks.map(p => p.team)])];
    // Remove old week picks, add new ones
    const withoutOld = (user.usedTeams || []).filter(t =>
      !(existing?.picks || []).some(ep => ep.team === t)
    );
    const newUsed = [...new Set([...withoutOld, ...picks.map(p => p.team)])];
    await User.findByIdAndUpdate(req.user._id, { usedTeams: newUsed });

    const submission = await WeeklyPick.findOne({ user: req.user._id, season, week });
    res.json({ success: true, submission });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/picks/my-history ──────────────────────────────────────────────────
router.get('/my-history', authenticate, async (req, res) => {
  try {
    const season = SEASON();
    const history = await WeeklyPick.find({
      user: req.user._id, season,
    }).sort({ week: 1 });
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/picks/leaderboard ─ season + current week ────────────────────────
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const season = SEASON();

    // Season standings
    const users = await User.find({ isActive: true, emailVerified: true })
      .select('displayName username avatarUrl seasonPoints weeklyPoints usedTeams')
      .sort({ seasonPoints: -1, displayName: 1 });

    const seasonStandings = users.map((u, i) => ({
      rank: i + 1,
      userId: u._id,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
      seasonPoints: u.seasonPoints,
      weeklyPoints: u.weeklyPoints,
      teamsUsed: (u.usedTeams || []).length,
    }));

    // Current/most recent week results
    const latestWeek = await WeekConfig.findOne({
      season, $or: [{ isOpen: true }, { isScored: true }]
    }).sort({ week: -1 });

    let weeklyBoard = [];
    let currentWeek = null;

    if (latestWeek) {
      currentWeek = latestWeek.week;
      const weekPicks = await WeeklyPick.find({ season, week: latestWeek.week })
        .populate('user', 'displayName username avatarUrl')
        .sort({ totalPoints: -1 });

      weeklyBoard = weekPicks.map((wp, i) => ({
        rank: i + 1,
        userId: wp.user._id,
        displayName: wp.user.displayName,
        username: wp.user.username,
        avatarUrl: wp.user.avatarUrl,
        weekPoints: wp.totalPoints,
        wasRandyd: wp.wasRandyd,
        isScored: wp.isScored,
        // Only show picks if scored
        picks: latestWeek.isScored ? wp.picks : [],
      }));
    }

    res.json({ seasonStandings, weeklyBoard, currentWeek, season });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/picks/leaderboard/week/:week ────────────────────────────────────
router.get('/leaderboard/week/:week', authenticate, async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();

    const weekConfig = await WeekConfig.findOne({ season, week });
    const weekPicks = await WeeklyPick.find({ season, week })
      .populate('user', 'displayName username avatarUrl')
      .sort({ totalPoints: -1 });

    const board = weekPicks.map((wp, i) => ({
      rank: i + 1,
      userId: wp.user._id,
      displayName: wp.user.displayName,
      username: wp.user.username,
      avatarUrl: wp.user.avatarUrl,
      weekPoints: wp.totalPoints,
      wasRandyd: wp.wasRandyd,
      isScored: wp.isScored,
      picks: weekConfig?.isScored ? wp.picks : [],
    }));

    res.json({ board, weekConfig, week });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
