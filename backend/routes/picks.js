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

    const [submittedCount, totalPlayers] = await Promise.all([
      WeeklyPick.countDocuments({ season, week: openWeek.week }),
      User.countDocuments({ isActive: true, emailVerified: true }),
    ]);

    res.json({
      openWeek: {
        week: openWeek.week,
        label: openWeek.label || (openWeek.week === 1 ? 'Week 0/1' : `Week ${openWeek.week}`),
        deadline: openWeek.deadline,
        hoursLeft,
        picksRequired: openWeek.picksRequired || (openWeek.week <= 2 ? 4 : 5),
        notes: openWeek.notes || '',
        submittedCount,
        totalPlayers,
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
    const now = new Date();

    // Exclude teams in current week's existing picks so editing works
    const existing = await WeeklyPick.findOne({ user: req.user._id, season, week });
    if (existing) for (const p of existing.picks) usedSet.delete(p.team);

    const games = await Game.find({ season, week }).sort({ gameDate: 1 });

    // Return game objects shaped for the frontend tile renderer
    const result = games
      .filter(g => g.homeIsPower4 || g.awayIsPower4) // at least one P4 team
      .map(g => {
        const gameDate = g.gameDate ? new Date(g.gameDate) : null;
        const isThursday = gameDate ? gameDate.getDay() === 4 : false;
        let thursdayLocked = false;
        if (isThursday && gameDate) {
          const thuNoon = new Date(gameDate);
          thuNoon.setHours(12, 0, 0, 0);
          thursdayLocked = now >= thuNoon;
        }

        return {
          _id: g._id,
          homeTeam: g.homeTeam,
          awayTeam: g.awayTeam,
          homeIsPower4: g.homeIsPower4,
          awayIsPower4: g.awayIsPower4,
          matchupType: g.matchupType,
          gameDate: gameDate?.toISOString() || null,
          homeWinProb: g.homeWinProb || null,
          thursdayLocked,
          // Per-team used status
          homeUsed: usedSet.has(g.homeTeam),
          awayUsed: usedSet.has(g.awayTeam),
        };
      });

    res.json({ games: result, week });
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

    // Enrich existing submission picks with opponent from Game docs
    let enrichedSubmission = submission;
    if (submission?.picks?.length > 0) {
      const games = await Game.find({ season, week });
      const oppMap = {};
      for (const g of games) {
        oppMap[g.homeTeam] = g.awayTeam;
        oppMap[g.awayTeam] = g.homeTeam;
      }
      const subObj = submission.toObject();
      enrichedSubmission = {
        ...subObj,
        picks: subObj.picks.map(p => ({ ...p, opponent: oppMap[p.team] || null })),
      };
    }

    res.json({
      weekConfig,
      submission: enrichedSubmission,
      picksRequired: weekConfig?.picksRequired || PICKS_PER_WEEK[week] || 5,
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

    // Validate pick count — allow fewer if player is running low on valid teams
    const required = PICKS_PER_WEEK[week] || 5;
    if (!Array.isArray(picks) || picks.length === 0) {
      return res.status(400).json({ error: 'Must submit at least 1 pick' });
    }
    if (picks.length > required) {
      return res.status(400).json({ error: `Week ${week} allows at most ${required} picks` });
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
      // Thursday game lock — can't add/change a Thursday team after Thursday noon
      const teamGame = games.find(g => g.homeTeam === pick.team || g.awayTeam === pick.team);
      if (teamGame?.gameDate) {
        const gd = new Date(teamGame.gameDate);
        if (gd.getDay() === 4) {
          const thuNoon = new Date(gd); thuNoon.setHours(12, 0, 0, 0);
          const now = new Date();
          // Only block if this is a NEW pick (not carried over from previous submission)
          const wasInExisting = (existing?.picks || []).some(ep => ep.team === pick.team);
          if (now >= thuNoon && !wasInExisting) {
            return res.status(400).json({ error: `${pick.team} played on Thursday — deadline has passed for this game` });
          }
        }
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

    // Enrich picks with opponent from Game docs
    const allWeeks = [...new Set(history.map(h => h.week))];
    const gamesByWeek = {};
    for (const wk of allWeeks) {
      const games = await Game.find({ season, week: wk });
      const oppMap = {};
      for (const g of games) {
        oppMap[g.homeTeam] = g.awayTeam;
        oppMap[g.awayTeam] = g.homeTeam;
      }
      gamesByWeek[wk] = oppMap;
    }

    const enriched = history.map(wp => ({
      ...wp.toObject(),
      picks: wp.picks.map(p => ({
        ...p.toObject ? p.toObject() : p,
        opponent: (gamesByWeek[wp.week] || {})[p.team] || null,
      })),
    }));

    res.json({ history: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── GET /api/picks/leaderboard/public ─ no auth required ─────────────────────
router.get('/leaderboard/public', async (req, res) => {
  try {
    const season = SEASON();

    const users = await User.find({ isActive: true, emailVerified: true })
      .select('displayName username seasonPoints weeklyPoints usedTeams')
      .sort({ seasonPoints: -1, displayName: 1 });

    const seasonStandings = users.map((u, i) => ({
      rank: i + 1,
      displayName: u.displayName,
      username: u.username,
      seasonPoints: u.seasonPoints,
      teamsUsed: (u.usedTeams || []).length,
      weeklyPoints: (u.weeklyPoints || []).slice(-5),
    }));

    const latestScored = await WeekConfig.findOne({ season, isScored: true }).sort({ week: -1 });

    res.json({
      seasonStandings,
      season,
      lastScoredWeek: latestScored ? (latestScored.week === 1 ? 'Week 0/1' : `Week ${latestScored.week}`) : null,
      updatedAt: new Date(),
    });
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

// ── GET /api/picks/reveal/:week ── show all picks after deadline ──────────────
router.get('/reveal/:week', authenticate, async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    const season = SEASON();

    const weekConfig = await WeekConfig.findOne({ season, week });
    if (!weekConfig) return res.status(404).json({ error: 'Week not found' });

    // Only reveal after deadline has passed
    const now = new Date();
    const deadlinePassed = weekConfig.deadline && now > new Date(weekConfig.deadline);
    if (!deadlinePassed && !weekConfig.isScored) {
      return res.status(403).json({ error: 'Picks not yet revealed — deadline has not passed' });
    }

    const allPicks = await WeeklyPick.find({ season, week })
      .populate('user', 'displayName username')
      .sort({ totalPoints: -1 });

    // Build opponent lookup from Game docs
    const weekGames = await Game.find({ season, week });
    const opponentMap = {}; // team → opponent name
    for (const g of weekGames) {
      opponentMap[g.homeTeam] = g.awayTeam;
      opponentMap[g.awayTeam] = g.homeTeam;
    }

    const reveal = allPicks.map(wp => ({
      userId: wp.user._id,
      displayName: wp.user.displayName,
      username: wp.user.username,
      totalPoints: wp.totalPoints,
      wasRandyd: wp.wasRandyd,
      isScored: wp.isScored,
      picks: wp.picks.map(p => ({
        team: p.team,
        pickType: p.pickType,
        result: p.result,
        pointsEarned: p.pointsEarned,
        opponent: opponentMap[p.team] || null,
      })),
    }));

    // Most picked teams
    const teamCounts = {};
    for (const wp of allPicks) {
      for (const p of wp.picks) {
        if (!teamCounts[p.team]) teamCounts[p.team] = { team: p.team, total: 0, win: 0, upset: 0 };
        teamCounts[p.team].total++;
        if (p.pickType === 'win_vs_power4') teamCounts[p.team].win++;
        else teamCounts[p.team].upset++;
      }
    }
    const mostPicked = Object.values(teamCounts).sort((a, b) => b.total - a.total).slice(0, 8);

    res.json({ reveal, weekConfig, mostPicked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/picks/h2h/:userId ── head to head comparison ────────────────────
router.get('/h2h/:userId', authenticate, async (req, res) => {
  try {
    const season = SEASON();
    const myId = req.user._id;
    const theirId = req.params.userId;

    const [me, them] = await Promise.all([
      User.findById(myId).select('displayName username seasonPoints'),
      User.findById(theirId).select('displayName username seasonPoints'),
    ]);
    if (!them) return res.status(404).json({ error: 'Player not found' });

    // Get all scored weeks
    const scoredWeeks = await WeekConfig.find({ season, isScored: true }).sort({ week: 1 });

    const weeks = [];
    let myWins = 0, theirWins = 0, ties = 0;

    for (const wc of scoredWeeks) {
      const [myPick, theirPick] = await Promise.all([
        WeeklyPick.findOne({ season, week: wc.week, user: myId }),
        WeeklyPick.findOne({ season, week: wc.week, user: theirId }),
      ]);

      const myPts = myPick?.totalPoints ?? 0;
      const theirPts = theirPick?.totalPoints ?? 0;

      if (myPts > theirPts) myWins++;
      else if (theirPts > myPts) theirWins++;
      else ties++;

      weeks.push({
        week: wc.week,
        label: wc.week === 1 ? 'Week 0/1' : `Week ${wc.week}`,
        me: myPick ? {
          points: myPick.totalPoints,
          wasRandyd: myPick.wasRandyd,
          picks: myPick.picks,
        } : null,
        them: theirPick ? {
          points: theirPick.totalPoints,
          wasRandyd: theirPick.wasRandyd,
          picks: theirPick.picks,
        } : null,
      });
    }

    res.json({
      me: { displayName: me.displayName, seasonPoints: me.seasonPoints },
      them: { displayName: them.displayName, seasonPoints: them.seasonPoints },
      record: { myWins, theirWins, ties },
      weeks,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── POST /api/picks/week/:week/ask-randy ─────────────────────────────────────
// Generate a random valid pick set for the player without saving — returns
// suggestions they can accept or re-roll as many times as they like.
router.post('/week/:week/ask-randy', authenticate, requireVerified, async (req, res) => {
  try {
    const season = SEASON();
    const week = parseInt(req.params.week);

    const [weekConfig, games, user] = await Promise.all([
      WeekConfig.findOne({ season, week }),
      Game.find({ season, week }),
      req.user,
    ]);

    if (!weekConfig?.isOpen) return res.status(400).json({ error: 'Week is not open' });

    const picksRequired = weekConfig.picksRequired || (week <= 2 ? 4 : 5);
    const usedSet = new Set(user.usedTeams || []);

    // Build eligible pools from this week's games
    const upsetEligible = new Set();
    const winEligible = new Set();
    for (const g of games) {
      if (g.matchupType === 'p4_vs_nonp4') { upsetEligible.add(g.homeTeam); winEligible.add(g.homeTeam); }
      if (g.matchupType === 'nonp4_vs_p4') { upsetEligible.add(g.awayTeam); winEligible.add(g.awayTeam); }
      if (g.matchupType === 'p4_vs_p4') { winEligible.add(g.homeTeam); winEligible.add(g.awayTeam); }
    }

    const availForWin = [...winEligible].filter(t => !usedSet.has(t));
    const availForUpset = [...upsetEligible].filter(t => !usedSet.has(t));

    const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
    const winPool = shuffle(availForWin);
    const upsetPool = shuffle(availForUpset);

    const picks = [];
    const pickedThisWeek = new Set();

    // Try to include at least 1 upset
    if (upsetPool.length > 0) {
      const team = upsetPool.find(t => !pickedThisWeek.has(t));
      if (team) { picks.push({ team, pickType: 'upset_loss' }); pickedThisWeek.add(team); }
    }

    // Fill with wins
    for (const team of winPool) {
      if (picks.length >= picksRequired) break;
      if (!pickedThisWeek.has(team)) { picks.push({ team, pickType: 'win_vs_power4' }); pickedThisWeek.add(team); }
    }

    // Fallback
    if (picks.length < picksRequired) {
      const fallback = shuffle(ALL_TEAMS.filter(t => !usedSet.has(t) && !pickedThisWeek.has(t)));
      for (const team of fallback) {
        if (picks.length >= picksRequired) break;
        picks.push({ team, pickType: 'win_vs_power4' });
        pickedThisWeek.add(team);
      }
    }

    if (picks.length === 0) return res.status(400).json({ error: 'No available teams to pick from' });

    res.json({ picks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/picks/team/:team/schedule ────────────────────────────────────────
// Full season schedule for a P4 team: past results + upcoming games with pick context
router.get('/team/:team/schedule', authenticate, async (req, res) => {
  try {
    const team = decodeURIComponent(req.params.team);
    const season = SEASON();
    const user = await User.findById(req.user._id);
    const usedSet = new Set(user.usedTeams || []);

    // All games this team appears in, across all weeks
    const games = await Game.find({
      season,
      $or: [{ homeTeam: team }, { awayTeam: team }],
    }).sort({ week: 1 });

    // All weeks so we can get deadlines
    const weekConfigs = await WeekConfig.find({ season }).sort({ week: 1 });
    const weekMap = {};
    for (const wc of weekConfigs) weekMap[wc.week] = wc;

    // Has this user picked this team before, and in which week?
    const myPicks = await WeeklyPick.find({ user: req.user._id, season });
    const pickedInWeek = {};
    for (const wp of myPicks) {
      for (const p of wp.picks) {
        if (p.team === team) pickedInWeek[wp.week] = p.pickType;
      }
    }

    const now = new Date();

    const schedule = games.map(g => {
      const isHome = g.homeTeam === team;
      const opponent = isHome ? g.awayTeam : g.homeTeam;
      const opponentIsPower4 = isHome ? g.awayIsPower4 : g.homeIsPower4;
      const winProb = isHome ? g.homeWinProb : g.awayWinProb;
      const teamScore  = isHome ? g.homeScore : g.awayScore;
      const oppScore   = isHome ? g.awayScore : g.homeScore;
      const won = g.homeWon == null ? null : (isHome ? g.homeWon : !g.homeWon);

      const wc = weekMap[g.week];
      const deadlinePassed = wc?.deadline ? now > new Date(wc.deadline) : false;

      // Pick availability for this user this week
      const alreadyUsed = usedSet.has(team) && !pickedInWeek[g.week]; // used in prior week
      const pickedThisWeek = pickedInWeek[g.week] || null;

      return {
        week: g.week,
        weekLabel: g.week === 1 ? 'Week 0/1' : `Week ${g.week}`,
        gameDate: g.gameDate,
        opponent,
        opponentIsPower4,
        isHome,
        matchupType: g.matchupType,
        winProb,
        // Results (null if not yet played)
        teamScore: teamScore ?? null,
        oppScore: oppScore ?? null,
        won,                          // true / false / null (tie or not played)
        isScored: wc?.isScored || false,
        deadlinePassed,
        // Pick context for the logged-in user
        alreadyUsed,
        pickedThisWeek,               // pickType string or null
        weekOpen: wc?.isOpen || false,
      };
    });

    // League-wide: how many players picked this team per week, and results
    const allPicks = await WeeklyPick.find({ season })
      .populate('user', 'displayName');

    const leagueByWeek = {};
    for (const wp of allPicks) {
      for (const p of wp.picks) {
        if (p.team !== team) continue;
        if (!leagueByWeek[wp.week]) leagueByWeek[wp.week] = [];
        leagueByWeek[wp.week].push({
          displayName: wp.user.displayName,
          pickType: p.pickType,
          result: p.result || null,
          pointsEarned: p.pointsEarned ?? null,
        });
      }
    }

    // Find the conference for this team
    let conference = 'Independent';
    for (const [conf, teams] of Object.entries(CONFERENCES)) {
      if (teams.includes(team)) { conference = conf; break; }
    }

    res.json({ team, conference, schedule, leagueByWeek, usedByMe: usedSet.has(team) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/picks/matrix ─────────────────────────────────────────────────────
// Full picks matrix for both view modes:
//   teams view:   teams × weeks — cell = picks made on that team that week
//   players view: players × weeks — cell = that player's pick(s) + result that week
router.get('/matrix', authenticate, async (req, res) => {
  try {
    const season = SEASON();

    const [allPicks, weekConfigs, users] = await Promise.all([
      WeeklyPick.find({ season }).populate('user', 'displayName _id'),
      WeekConfig.find({ season }).sort({ week: 1 }),
      User.find({ isActive: true, emailVerified: true }).select('displayName _id'),
    ]);

    const weeks = weekConfigs.map(wc => ({
      week: wc.week,
      label: wc.week === 1 ? 'Wk 0/1' : `Wk ${wc.week}`,
      isScored: wc.isScored,
      isOpen: wc.isOpen,
      // weeklyWinners: array of { userId } for trophy rendering
      winnerIds: (wc.weeklyWinners || []).map(w => w.userId?.toString()).filter(Boolean),
    }));

    // ── TEAMS VIEW ──
    // teamsMatrix[team][week] = { picks: [{displayName, pickType, result, pointsEarned}] }
    const teamsMatrix = {};
    for (const wp of allPicks) {
      for (const p of wp.picks) {
        if (!teamsMatrix[p.team]) teamsMatrix[p.team] = {};
        if (!teamsMatrix[p.team][wp.week]) teamsMatrix[p.team][wp.week] = [];
        teamsMatrix[p.team][wp.week].push({
          displayName: wp.user.displayName,
          pickType: p.pickType,
          result: p.result || null,
          pointsEarned: p.pointsEarned ?? null,
        });
      }
    }

    // Build sorted team rows (by total pick count desc)
    const teamRows = Object.entries(teamsMatrix).map(([team, byWeek]) => {
      const totalPicks = Object.values(byWeek).reduce((s, arr) => s + arr.length, 0);
      return { team, byWeek, totalPicks };
    }).sort((a, b) => b.totalPicks - a.totalPicks);

    // ── PLAYERS VIEW ──
    // Build opponent map for matrix: matrixOpponentMap[week][team] = opponentName
    const allWeekNums = weekConfigs.map(wc => wc.week);
    const matrixOpponentMap = {};
    for (const wk of allWeekNums) {
      const games = await Game.find({ season, week: wk });
      const oppMap = {};
      for (const g of games) {
        oppMap[g.homeTeam] = g.awayTeam;
        oppMap[g.awayTeam] = g.homeTeam;
      }
      matrixOpponentMap[wk] = oppMap;
    }

    // playersMatrix[userId][week] = { picks: [{team, pickType, result, pointsEarned, opponent}], totalPoints, wasRandyd }
    const playersMatrix = {};
    const playerNames = {};
    for (const wp of allPicks) {
      const uid = wp.user._id.toString();
      playerNames[uid] = wp.user.displayName;
      if (!playersMatrix[uid]) playersMatrix[uid] = {};
      playersMatrix[uid][wp.week] = {
        picks: wp.picks.map(p => ({
          team: p.team,
          pickType: p.pickType,
          result: p.result || null,
          pointsEarned: p.pointsEarned ?? null,
          opponent: matrixOpponentMap[wp.week]?.[p.team] || null,
        })),
        totalPoints: wp.totalPoints,
        wasRandyd: wp.wasRandyd,
        isScored: wp.isScored,
      };
    }

    // Sort player rows by season points desc
    const playerRows = users.map(u => ({
      userId: u._id.toString(),
      displayName: u.displayName,
      byWeek: playersMatrix[u._id.toString()] || {},
    })).sort((a, b) => {
      const aTotal = Object.values(a.byWeek).reduce((s, w) => s + (w.totalPoints || 0), 0);
      const bTotal = Object.values(b.byWeek).reduce((s, w) => s + (w.totalPoints || 0), 0);
      return bTotal - aTotal;
    });

    res.json({ weeks, teamRows, playerRows, myId: req.user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
