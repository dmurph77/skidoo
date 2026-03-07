/**
 * seedSchedule.js
 * Run once before the season: node utils/seedSchedule.js
 *
 * Fetches all 2026 regular season games from collegefootballdata.com,
 * filters to games involving at least one Power 4 team,
 * pre-computes matchupType and upset/win eligibility,
 * and saves to MongoDB.
 *
 * Usage:
 *   CFBD_API_KEY=xxx MONGODB_URI=xxx node utils/seedSchedule.js
 *   or set .env and run: node -r dotenv/config utils/seedSchedule.js
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const { Game } = require('../models/Season');
const { isPower4, ALL_TEAMS, fromCFBDName } = require('./teams');

const CFBD_BASE = 'https://api.collegefootballdata.com';
const SEASON = parseInt(process.env.CURRENT_SEASON || '2026');

const cfbd = axios.create({
  baseURL: CFBD_BASE,
  headers: { Authorization: `Bearer ${process.env.CFBD_API_KEY}` },
});

async function fetchGamesForWeek(week) {
  const res = await cfbd.get('/games', {
    params: { year: SEASON, week, seasonType: 'regular' },
  });
  return res.data;
}

function classifyMatchup(homeTeam, awayTeam) {
  const homeP4 = isPower4(homeTeam);
  const awayP4 = isPower4(awayTeam);
  if (homeP4 && awayP4) return 'p4_vs_p4';
  if (homeP4 && !awayP4) return 'p4_vs_nonp4';
  if (!homeP4 && awayP4) return 'nonp4_vs_p4';
  return null; // neither team is P4 — skip
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing games for this season
  await Game.deleteMany({ season: SEASON });
  console.log(`🗑  Cleared existing ${SEASON} games`);

  let totalInserted = 0;

  for (let week = 1; week <= 14; week++) {
    console.log(`📅 Fetching week ${week}...`);
    try {
      const games = await fetchGamesForWeek(week);

      const docs = [];
      for (const g of games) {
        // Normalize CFBD names → our display names first
        const homeDisplay = fromCFBDName(g.homeTeam);
        const awayDisplay = fromCFBDName(g.awayTeam);
        const matchupType = classifyMatchup(homeDisplay, awayDisplay);
        if (!matchupType) continue; // skip non-P4 games

        docs.push({
          season: SEASON,
          week,
          gameId: g.id,
          homeTeam: homeDisplay,
          awayTeam: awayDisplay,
          homeIsPower4: isPower4(homeDisplay),
          awayIsPower4: isPower4(awayDisplay),
          gameDate: g.startDate ? new Date(g.startDate) : null,
          homeScore: g.homePoints ?? null,
          awayScore: g.awayPoints ?? null,
          homeWon: g.homePoints != null && g.awayPoints != null
            ? g.homePoints > g.awayPoints : null,
          homeWinProb: g.homePregameWinProbability ?? null,
          awayWinProb: g.homePregameWinProbability != null ? 1 - g.homePregameWinProbability : null,
          matchupType: classifyMatchup(homeDisplay, awayDisplay),
        });
      }

      if (docs.length > 0) {
        await Game.insertMany(docs);
        totalInserted += docs.length;
        console.log(`   ✓ Inserted ${docs.length} games for week ${week}`);
      } else {
        console.log(`   ℹ  No P4 games found for week ${week}`);
      }

      // Respect rate limits
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`   ✗ Error fetching week ${week}:`, err.message);
    }
  }

  // Summary: show upset-eligible teams per week
  console.log('\n📊 Upset-eligible teams by week:');
  for (let week = 1; week <= 14; week++) {
    const games = await Game.find({ season: SEASON, week });
    const upsetEligible = [];
    for (const g of games) {
      if (g.matchupType === 'p4_vs_nonp4') upsetEligible.push(`${g.homeTeam} (home)`);
      if (g.matchupType === 'nonp4_vs_p4') upsetEligible.push(`${g.awayTeam} (away)`);
    }
    console.log(`  Week ${week}: ${upsetEligible.length > 0 ? upsetEligible.join(', ') : 'none'}`);
  }

  console.log(`\n✅ Done. Total games inserted: ${totalInserted}`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
