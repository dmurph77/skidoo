/**
 * autoScore.js
 * Runs on Sundays automatically. Fetches completed game scores from CFBD,
 * updates Game documents, then pre-populates pick results for admin confirmation.
 *
 * This does NOT finalize the week — admin still reviews and confirms.
 */

const cron = require('node-cron');
const axios = require('axios');
const { Game, WeekConfig } = require('../models/Season');
const WeeklyPick = require('../models/WeeklyPick');
const { isPower4 } = require('../utils/teams');

const cfbd = () => axios.create({
  baseURL: 'https://api.collegefootballdata.com',
  headers: { Authorization: `Bearer ${process.env.CFBD_API_KEY}` },
  timeout: 10000, // 10s — prevents cron from hanging if CFBD is slow
});

async function fetchScoresForWeek(season, week) {
  const res = await cfbd().get('/games', {
    params: { year: season, week, seasonType: 'regular' },
  });
  return res.data.filter(g => g.homePoints != null && g.awayPoints != null);
}

async function updateGameScores(season, week) {
  const games = await fetchScoresForWeek(season, week);
  let updated = 0;

  for (const g of games) {
    const result = await Game.findOneAndUpdate(
      { season, week, gameId: g.id },
      {
        homeScore: g.homePoints,
        awayScore: g.awayPoints,
        homeWon: g.homePoints > g.awayPoints ? true : g.homePoints < g.awayPoints ? false : null, // null = tie
      },
      { new: true }
    );
    if (result) updated++;
  }

  console.log(`  📊 Updated scores for ${updated} games (Week ${week})`);
  return updated;
}

// Pre-populate pick results based on game scores
// Admin still needs to confirm — this just saves them looking up each result
async function prePopulatePickResults(season, week) {
  const games = await Game.find({ season, week, homeWon: { $ne: null } });

  // Build result map: teamName → { won: bool, matchupType }
  const resultMap = {};
  for (const g of games) {
    if (g.homeIsPower4) {
      resultMap[g.homeTeam] = {
        won: g.homeWon === true,
        matchupType: g.matchupType,
        opponent: g.awayTeam,
        opponentIsPower4: g.awayIsPower4,
      };
    }
    if (g.awayIsPower4) {
      resultMap[g.awayTeam] = {
        won: g.homeWon === false,
        matchupType: g.matchupType,
        opponent: g.homeTeam,
        opponentIsPower4: g.homeIsPower4,
      };
    }
  }

  // Update all submissions for this week
  const submissions = await WeeklyPick.find({ season, week, isScored: false });
  let updated = 0;

  for (const sub of submissions) {
    let changed = false;
    for (const pick of sub.picks) {
      const gameResult = resultMap[pick.team];
      if (!gameResult) continue; // game not yet played or not found

      let result = 'pending';
      let points = 0;

      if (pick.pickType === 'win_vs_power4') {
        // Correct if team won vs Power 4 opponent (1pt), tie = 0.5pt, loss = 0
        if (gameResult.won === true && gameResult.opponentIsPower4) {
          result = 'correct'; points = 1;
        } else if (gameResult.won === null && gameResult.opponentIsPower4) {
          result = 'correct'; points = 0.5; // tie
        } else if (gameResult.won === false || gameResult.won === null) {
          result = 'incorrect'; points = 0;
        }
      } else if (pick.pickType === 'upset_loss') {
        // Correct if team LOST to a non-Power 4 opponent (2pt), tie = 1pt, won = 0
        if (gameResult.won === false && !gameResult.opponentIsPower4) {
          result = 'correct'; points = 2;
        } else if (gameResult.won === null && !gameResult.opponentIsPower4) {
          result = 'correct'; points = 1; // tie against non-P4 = half upset points
        } else {
          result = 'incorrect'; points = 0;
        }
      }

      pick.result = result;
      pick.pointsEarned = points;
      changed = true;
    }

    if (changed) {
      sub.recalcTotal();
      await sub.save();
      updated++;
    }
  }

  console.log(`  ✅ Pre-populated results for ${updated} submissions`);
  return updated;
}

// Main function — called by admin "refresh scores" button or cron
async function autoScoreWeek(season, week) {
  console.log(`🏈 Auto-scoring Season ${season} Week ${week}...`);
  const scoresUpdated = await updateGameScores(season, week);
  const picksUpdated = await prePopulatePickResults(season, week);
  return { scoresUpdated, picksUpdated };
}

// Sunday cron: runs every hour from noon to midnight (ET)
// Catches games as they finish throughout the day
function startAutoScoreCron() {
  // Every hour on Sundays (0 12-23 * * 0)
  cron.schedule('0 12-23 * * 0', async () => {
    try {
      const season = parseInt(process.env.CURRENT_SEASON || '2026');

      // Find the most recently closed (not yet scored) week
      const week = await WeekConfig.findOne({
        season,
        isOpen: false,
        isScored: false,
      }).sort({ week: -1 });

      if (!week) return;

      await autoScoreWeek(season, week.week);
    } catch (err) {
      console.error('Auto-score cron error:', err.message);
    }
  });

  console.log('🏈 Auto-score cron started (Sundays, noon–midnight)');
}

module.exports = { autoScoreWeek, startAutoScoreCron };
