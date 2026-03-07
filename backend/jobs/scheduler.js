const cron = require('node-cron');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const User = require('../models/User');
const WeeklyPick = require('../models/WeeklyPick');
const { WeekConfig, Game } = require('../models/Season');
const { ALL_TEAMS, PICKS_PER_WEEK, isPower4 } = require('../utils/teams');
const { sendRandyEmail, sendDeadlineReminderEmail, sendThursdayWarningEmail } = require('../utils/email');

// ── RANDY THE RANDOMIZER ────────────────────────────────────────────────────────
// Called when a week's deadline passes. For each active user without a submission,
// auto-assigns random valid picks respecting per-season team uniqueness.

async function runRandy(weekConfig) {
  const { season, week } = weekConfig;
  const picksRequired = PICKS_PER_WEEK[week] || 5;

  console.log(`🎲 Randy firing for Season ${season} Week ${week}...`);

  // Get all active, verified users
  const users = await User.find({ isActive: true, emailVerified: true });

  // Get all existing submissions for this week
  const submissions = await WeeklyPick.find({ season, week });
  const submittedUserIds = new Set(submissions.map(s => s.user.toString()));

  // Get all games for this week (for upset eligibility)
  const games = await Game.find({ season, week });
  const upsetEligibleTeams = new Set();
  const winEligibleTeams = new Set();

  for (const g of games) {
    if (g.matchupType === 'p4_vs_nonp4') upsetEligibleTeams.add(g.homeTeam);
    if (g.matchupType === 'nonp4_vs_p4') upsetEligibleTeams.add(g.awayTeam);
    if (g.matchupType === 'p4_vs_p4') {
      winEligibleTeams.add(g.homeTeam);
      winEligibleTeams.add(g.awayTeam);
    }
    // P4 teams playing non-P4 can also be picked for win
    if (g.matchupType === 'p4_vs_nonp4') winEligibleTeams.add(g.homeTeam);
    if (g.matchupType === 'nonp4_vs_p4') winEligibleTeams.add(g.awayTeam);
  }

  let randydCount = 0;

  for (const user of users) {
    if (submittedUserIds.has(user._id.toString())) continue; // already submitted

    const usedSet = new Set(user.usedTeams || []);

    // Available teams this user hasn't used yet
    const availForWin = [...winEligibleTeams].filter(t => !usedSet.has(t));
    const availForUpset = [...upsetEligibleTeams].filter(t => !usedSet.has(t));

    const picks = [];
    const pickedThisWeek = new Set();

    // Shuffle helper
    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

    const winPool = shuffle([...availForWin]);
    const upsetPool = shuffle([...availForUpset]);

    // Try to include at least 1 upset pick if possible (2pt opportunity)
    let upsetPicked = 0;
    if (upsetPool.length > 0 && picks.length < picksRequired) {
      const team = upsetPool.find(t => !pickedThisWeek.has(t));
      if (team) {
        picks.push({ team, pickType: 'upset_loss' });
        pickedThisWeek.add(team);
        upsetPicked++;
      }
    }

    // Fill remaining with win picks
    for (const team of winPool) {
      if (picks.length >= picksRequired) break;
      if (pickedThisWeek.has(team)) continue;
      picks.push({ team, pickType: 'win_vs_power4' });
      pickedThisWeek.add(team);
    }

    // If still not enough (edge case: team pool exhausted), fill from any remaining available
    if (picks.length < picksRequired) {
      const fallback = ALL_TEAMS.filter(t => !usedSet.has(t) && !pickedThisWeek.has(t));
      shuffle(fallback);
      for (const team of fallback) {
        if (picks.length >= picksRequired) break;
        picks.push({ team, pickType: 'win_vs_power4' });
        pickedThisWeek.add(team);
      }
    }

    if (picks.length === 0) {
      console.warn(`  ⚠ Could not generate picks for ${user.displayName} — no teams available`);
      continue;
    }

    // Save submission
    const submission = new WeeklyPick({
      user: user._id, season, week,
      picks, wasRandyd: true,
      submittedAt: new Date(), lastModifiedAt: new Date(),
    });
    await submission.save();

    // Update user's used teams
    const newUsed = [...usedSet, ...picks.map(p => p.team)];
    await User.findByIdAndUpdate(user._id, { usedTeams: newUsed });

    // Send Randy email
    try {
      const weekLabel = week === 1 ? 'Week 0/1' : `Week ${week}`;
      await sendRandyEmail(user.email, user.displayName, weekLabel, picks);
      await sleep(80); // stagger
    } catch (e) {
      console.error(`  ✗ Randy email failed for ${user.email}:`, e.message);
    }

    console.log(`  🎲 Randy'd ${user.displayName} with ${picks.length} picks`);
    randydCount++;
  }

  console.log(`✅ Randy done. ${randydCount} players auto-picked.`);

  // Update recap: store list of Randy'd players
  await WeekConfig.findOneAndUpdate(
    { season, week },
    {
      $set: {
        'recap.randydPlayers': (
          await WeeklyPick.find({ season, week, wasRandyd: true }).select('user')
        ).map(s => s.user)
      }
    }
  );
}

// ── DEADLINE REMINDER ──────────────────────────────────────────────────────────
async function sendDeadlineReminders(weekConfig) {
  const { season, week, deadline } = weekConfig;
  const weekLabel = week === 1 ? 'Week 0/1' : `Week ${week}`;

  const users = await User.find({ isActive: true, emailVerified: true });
  const submissions = await WeeklyPick.find({ season, week }).select('user');
  const submittedIds = new Set(submissions.map(s => s.user.toString()));

  for (const user of users) {
    if (submittedIds.has(user._id.toString())) continue;
    try {
      await sendDeadlineReminderEmail(user.email, user.displayName, weekLabel, deadline);
    } catch (e) {
      console.error(`Reminder email failed for ${user.email}:`, e.message);
    }
  }
  console.log(`📧 Deadline reminders sent for ${weekLabel}`);
}


// ── THURSDAY WARNING EMAILS ────────────────────────────────────────────────────
// Fires ~2 hours before Thursday noon deadline for players with Thursday picks
async function sendThursdayWarnings(weekConfig) {
  const { season, week } = weekConfig;
  const weekLabel = week === 1 ? 'Week 0/1' : `Week ${week}`;
  const now = new Date();

  // Find all Thursday games this week
  const games = await Game.find({ season, week });
  const thursdayTeams = new Set();
  for (const g of games) {
    const gd = g.gameDate ? new Date(g.gameDate) : null;
    if (gd && gd.getDay() === 4) { // Thursday
      if (g.homeIsPower4) thursdayTeams.add(g.homeTeam);
      if (g.awayIsPower4) thursdayTeams.add(g.awayTeam);
    }
  }
  if (thursdayTeams.size === 0) return; // No Thursday games this week

  // Calculate Thursday noon
  const firstThursdayGame = games
    .filter(g => g.gameDate && new Date(g.gameDate).getDay() === 4)
    .sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate))[0];
  if (!firstThursdayGame) return;
  const thuNoon = new Date(firstThursdayGame.gameDate);
  thuNoon.setHours(12, 0, 0, 0);
  if (now >= thuNoon) return; // Already past Thursday noon

  // Find players who have NOT yet submitted for this week
  const users = await User.find({ isActive: true, emailVerified: true });
  const submissions = await WeeklyPick.find({ season, week }).select('user picks');
  const submittedIds = new Set(submissions.map(s => s.user.toString()));

  // Also warn players who HAVE submitted but used a Thursday team (to confirm awareness)
  let warned = 0;
  for (const user of users) {
    const sub = submissions.find(s => s.user.toString() === user._id.toString());
    if (sub) {
      // Already submitted — only warn if they picked a Thursday team
      const thursdayPickTeams = sub.picks
        .map(p => p.team)
        .filter(t => thursdayTeams.has(t));
      if (thursdayPickTeams.length === 0) continue;
      try {
        await sendThursdayWarningEmail(user.email, user.displayName, weekLabel, thursdayPickTeams, thuNoon);
        warned++;
      } catch (e) {
        console.error(`Thursday warning email failed for ${user.email}:`, e.message);
      }
    } else {
      // Not submitted yet — warn about all Thursday teams
      try {
        await sendThursdayWarningEmail(user.email, user.displayName, weekLabel, [...thursdayTeams], thuNoon);
        warned++;
      } catch (e) {
        console.error(`Thursday warning email failed for ${user.email}:`, e.message);
      }
    }
  }
  console.log(`⏰ Thursday warnings sent to ${warned} players for ${weekLabel}`);
}

// ── CRON SCHEDULER ─────────────────────────────────────────────────────────────
// Runs every 5 minutes and checks if any week needs Randy or reminders

function startCronJobs() {
  // Every 5 minutes: check for deadlines that just passed → run Randy
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const fiveMinAgo = new Date(now - 5 * 60 * 1000);

      // Find open weeks whose deadline just passed
      const dueWeeks = await WeekConfig.find({
        isOpen: true,
        isScored: false,
        deadline: { $lte: now, $gte: fiveMinAgo },
      });

      for (const wc of dueWeeks) {
        // Close the week first
        wc.isOpen = false;
        await wc.save();
        // Run Randy
        await runRandy(wc);
      }
    } catch (err) {
      console.error('Cron Randy error:', err.message);
    }
  });

  // Every hour: send 12-hour deadline reminders
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      const in11h = new Date(now.getTime() + 11 * 60 * 60 * 1000);

      const upcomingWeeks = await WeekConfig.find({
        isOpen: true,
        isScored: false,
        deadline: { $lte: in12h, $gte: in11h },
      });

      for (const wc of upcomingWeeks) {
        await sendDeadlineReminders(wc);
      }
    } catch (err) {
      console.error('Cron reminder error:', err.message);
    }
  });

  // Every hour: check if ~2 hours before any Thursday noon deadline
  cron.schedule('30 * * * *', async () => {
    try {
      const now = new Date();
      const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const in1h = new Date(now.getTime() + 1 * 60 * 60 * 1000);

      // Find open weeks with a Thursday game coming up in ~2 hours
      const openWeeks = await WeekConfig.find({ isOpen: true, isScored: false });
      for (const wc of openWeeks) {
        const games = await Game.find({ season: wc.season, week: wc.week });
        for (const g of games) {
          if (!g.gameDate) continue;
          const gd = new Date(g.gameDate);
          if (gd.getDay() !== 4) continue; // Only Thursday games
          const thuNoon = new Date(gd);
          thuNoon.setHours(12, 0, 0, 0);
          if (thuNoon >= in1h && thuNoon <= in2h) {
            await sendThursdayWarnings(wc);
            break; // One warning per week per hour check
          }
        }
      }
    } catch (err) {
      console.error('Thursday warning cron error:', err.message);
    }
  });

  console.log('⏰ Cron jobs started (Randy + reminders + Thursday warnings)');
}

module.exports = { startCronJobs, runRandy };
