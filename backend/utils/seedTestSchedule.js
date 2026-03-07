/**
 * seedTestSchedule.js
 * Seeds realistic placeholder games for 2026 testing.
 * Run this ONLY for local dev — replace with real seedSchedule.js when CFBD has 2026 data.
 *
 * Usage: node -r dotenv/config utils/seedTestSchedule.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Game } = require('../models/Season');

const SEASON = 2026;

// Sample games per week — mix of P4 vs P4 and P4 vs non-P4
// P4 vs P4 = win-eligible for both teams
// P4 vs nonP4 = win-eligible AND upset-eligible for the P4 team
const WEEKLY_GAMES = {
  1: [
    // P4 vs P4
    { home: 'Alabama', away: 'Georgia', homeP4: true, awayP4: true },
    { home: 'Ohio State', away: 'Michigan', homeP4: true, awayP4: true },
    { home: 'Texas', away: 'Oklahoma', homeP4: true, awayP4: true },
    { home: 'Clemson', away: 'Florida State', homeP4: true, awayP4: true },
    { home: 'Oregon', away: 'USC', homeP4: true, awayP4: true },
    { home: 'Penn State', away: 'Iowa', homeP4: true, awayP4: true },
    { home: 'LSU', away: 'Auburn', homeP4: true, awayP4: true },
    // P4 vs nonP4 (upset eligible)
    { home: 'Notre Dame', away: 'Akron', homeP4: true, awayP4: false },
    { home: 'Tennessee', away: 'App State', homeP4: true, awayP4: false },
    { home: 'Colorado', away: 'Northern Colorado', homeP4: true, awayP4: false },
    { home: 'BYU', away: 'Southern Utah', homeP4: true, awayP4: false },
  ],
  2: [
    { home: 'Georgia', away: 'Tennessee', homeP4: true, awayP4: true },
    { home: 'Michigan', away: 'Penn State', homeP4: true, awayP4: true },
    { home: 'Oklahoma', away: 'Texas A&M', homeP4: true, awayP4: true },
    { home: 'Florida State', away: 'Miami', homeP4: true, awayP4: true },
    { home: 'USC', away: 'UCLA', homeP4: true, awayP4: true },
    { home: 'Oregon', away: 'Washington', homeP4: true, awayP4: true },
    { home: 'Ole Miss', away: 'Troy', homeP4: true, awayP4: false },
    { home: 'Kansas State', away: 'Southeast Missouri', homeP4: true, awayP4: false },
    { home: 'Utah', away: 'Weber State', homeP4: true, awayP4: false },
  ],
  3: [
    { home: 'Alabama', away: 'Tennessee', homeP4: true, awayP4: true },
    { home: 'Ohio State', away: 'Penn State', homeP4: true, awayP4: true },
    { home: 'Texas', away: 'LSU', homeP4: true, awayP4: true },
    { home: 'Clemson', away: 'NC State', homeP4: true, awayP4: true },
    { home: 'Michigan', away: 'Iowa', homeP4: true, awayP4: true },
    { home: 'Notre Dame', away: 'Georgia Tech', homeP4: true, awayP4: true },
    { home: 'Florida', away: 'Citadel', homeP4: true, awayP4: false },
    { home: 'Arkansas', away: 'UAPB', homeP4: true, awayP4: false },
    { home: 'TCU', away: 'Tarleton State', homeP4: true, awayP4: false },
    { home: 'West Virginia', away: 'Duquesne', homeP4: true, awayP4: false },
  ],
  4: [
    { home: 'Georgia', away: 'Auburn', homeP4: true, awayP4: true },
    { home: 'Penn State', away: 'Michigan State', homeP4: true, awayP4: true },
    { home: 'Texas A&M', away: 'Ole Miss', homeP4: true, awayP4: true },
    { home: 'Miami', away: 'Virginia Tech', homeP4: true, awayP4: true },
    { home: 'Oregon', away: 'UCLA', homeP4: true, awayP4: true },
    { home: 'Iowa', away: 'Northwestern', homeP4: true, awayP4: true },
    { home: 'Vanderbilt', away: 'Charlotte', homeP4: true, awayP4: false },
    { home: 'Indiana', away: 'Western Michigan', homeP4: true, awayP4: false },
    { home: 'Arizona', away: 'Northern Arizona', homeP4: true, awayP4: false },
    { home: 'Cincinnati', away: 'Miami (OH)', homeP4: true, awayP4: false },
  ],
  5: [
    { home: 'Alabama', away: 'Mississippi State', homeP4: true, awayP4: true },
    { home: 'Ohio State', away: 'Nebraska', homeP4: true, awayP4: true },
    { home: 'Texas', away: 'Baylor', homeP4: true, awayP4: true },
    { home: 'Clemson', away: 'Syracuse', homeP4: true, awayP4: true },
    { home: 'USC', away: 'Stanford', homeP4: true, awayP4: true },
    { home: 'Missouri', away: 'Vanderbilt', homeP4: true, awayP4: true },
    { home: 'Kentucky', away: 'Eastern Kentucky', homeP4: true, awayP4: false },
    { home: 'Purdue', away: 'Indiana State', homeP4: true, awayP4: false },
    { home: 'Colorado', away: 'CSU', homeP4: true, awayP4: false },
    { home: 'Houston', away: 'Rice', homeP4: true, awayP4: false },
  ],
  6: [
    { home: 'Georgia', away: 'Florida', homeP4: true, awayP4: true },
    { home: 'Michigan', away: 'Nebraska', homeP4: true, awayP4: true },
    { home: 'LSU', away: 'Texas A&M', homeP4: true, awayP4: true },
    { home: 'Florida State', away: 'North Carolina', homeP4: true, awayP4: true },
    { home: 'Washington', away: 'Oregon State', homeP4: true, awayP4: true },
    { home: 'Iowa State', away: 'Kansas', homeP4: true, awayP4: true },
    { home: 'South Carolina', away: 'Coastal Carolina', homeP4: true, awayP4: false },
    { home: 'Illinois', away: 'Ball State', homeP4: true, awayP4: false },
    { home: 'Arizona State', away: 'Northern Arizona', homeP4: true, awayP4: false },
    { home: 'SMU', away: 'Stephen F. Austin', homeP4: true, awayP4: false },
  ],
  7: [
    { home: 'Alabama', away: 'Arkansas', homeP4: true, awayP4: true },
    { home: 'Ohio State', away: 'Wisconsin', homeP4: true, awayP4: true },
    { home: 'Texas', away: 'Kansas State', homeP4: true, awayP4: true },
    { home: 'Notre Dame', away: 'USC', homeP4: true, awayP4: true },
    { home: 'Penn State', away: 'Minnesota', homeP4: true, awayP4: true },
    { home: 'Auburn', away: 'Ole Miss', homeP4: true, awayP4: true },
    { home: 'Rutgers', away: 'Wagner', homeP4: true, awayP4: false },
    { home: 'Maryland', away: 'Towson', homeP4: true, awayP4: false },
    { home: 'Kansas', away: 'UTEP', homeP4: true, awayP4: false },
    { home: 'BYU', away: 'Sam Houston', homeP4: true, awayP4: false },
  ],
  8: [
    { home: 'Georgia', away: 'Tennessee', homeP4: true, awayP4: true },
    { home: 'Michigan', away: 'Ohio State', homeP4: true, awayP4: true },
    { home: 'Oklahoma', away: 'Iowa State', homeP4: true, awayP4: true },
    { home: 'Clemson', away: 'Duke', homeP4: true, awayP4: true },
    { home: 'Oregon', away: 'Cal', homeP4: true, awayP4: true },
    { home: 'Virginia Tech', away: 'Pittsburgh', homeP4: true, awayP4: true },
    { home: 'Mississippi State', away: 'UMass', homeP4: true, awayP4: false },
    { home: 'Northwestern', away: 'Miami (OH)', homeP4: true, awayP4: false },
    { home: 'UCF', away: 'FIU', homeP4: true, awayP4: false },
    { home: 'Utah', away: 'Idaho', homeP4: true, awayP4: false },
  ],
  9: [
    { home: 'Alabama', away: 'LSU', homeP4: true, awayP4: true },
    { home: 'Ohio State', away: 'Michigan State', homeP4: true, awayP4: true },
    { home: 'Texas', away: 'TCU', homeP4: true, awayP4: true },
    { home: 'Florida State', away: 'Boston College', homeP4: true, awayP4: true },
    { home: 'USC', away: 'Arizona', homeP4: true, awayP4: true },
    { home: 'Notre Dame', away: 'Wake Forest', homeP4: true, awayP4: true },
    { home: 'Florida', away: 'App State', homeP4: true, awayP4: false },
    { home: 'Indiana', away: 'Akron', homeP4: true, awayP4: false },
    { home: 'West Virginia', away: 'Marshall', homeP4: true, awayP4: false },
    { home: 'Colorado', away: 'New Mexico', homeP4: true, awayP4: false },
  ],
  10: [
    { home: 'Georgia', away: 'Mississippi State', homeP4: true, awayP4: true },
    { home: 'Penn State', away: 'Ohio State', homeP4: true, awayP4: true },
    { home: 'Texas A&M', away: 'Auburn', homeP4: true, awayP4: true },
    { home: 'Miami', away: 'Louisville', homeP4: true, awayP4: true },
    { home: 'Oregon', away: 'Washington', homeP4: true, awayP4: true },
    { home: 'Iowa', away: 'Illinois', homeP4: true, awayP4: true },
    { home: 'Tennessee', away: 'UT Martin', homeP4: true, awayP4: false },
    { home: 'Minnesota', away: 'Western Illinois', homeP4: true, awayP4: false },
    { home: 'Baylor', away: 'Lamar', homeP4: true, awayP4: false },
    { home: 'Syracuse', away: 'Holy Cross', homeP4: true, awayP4: false },
  ],
  11: [
    { home: 'Alabama', away: 'Auburn', homeP4: true, awayP4: true },
    { home: 'Ohio State', away: 'Indiana', homeP4: true, awayP4: true },
    { home: 'Texas', away: 'Oklahoma State', homeP4: true, awayP4: true },
    { home: 'Clemson', away: 'South Carolina', homeP4: true, awayP4: true },
    { home: 'Michigan', away: 'Northwestern', homeP4: true, awayP4: true },
    { home: 'LSU', away: 'Ole Miss', homeP4: true, awayP4: true },
    { home: 'Virginia', away: 'Old Dominion', homeP4: true, awayP4: false },
    { home: 'Purdue', away: 'FIU', homeP4: true, awayP4: false },
    { home: 'Kansas State', away: 'South Dakota', homeP4: true, awayP4: false },
    { home: 'Houston', away: 'North Texas', homeP4: true, awayP4: false },
  ],
  12: [
    { home: 'Georgia', away: 'Georgia Tech', homeP4: true, awayP4: true },
    { home: 'Michigan', away: 'Ohio State', homeP4: true, awayP4: true },
    { home: 'Oklahoma', away: 'Oklahoma State', homeP4: true, awayP4: true },
    { home: 'Florida State', away: 'Florida', homeP4: true, awayP4: true },
    { home: 'USC', away: 'Notre Dame', homeP4: true, awayP4: true },
    { home: 'Washington', away: 'Washington State', homeP4: true, awayP4: true },
    { home: 'Kentucky', away: 'Louisville', homeP4: true, awayP4: true },
    { home: 'South Carolina', away: 'Clemson', homeP4: true, awayP4: true },
    { home: 'Arkansas', away: 'Missouri', homeP4: true, awayP4: true },
    { home: 'Stanford', away: 'Cal', homeP4: true, awayP4: true },
  ],
  13: [
    { home: 'Alabama', away: 'Florida', homeP4: true, awayP4: true },
    { home: 'Ohio State', away: 'Wisconsin', homeP4: true, awayP4: true },
    { home: 'Texas', away: 'Texas A&M', homeP4: true, awayP4: true },
    { home: 'Clemson', away: 'Miami', homeP4: true, awayP4: true },
    { home: 'Oregon', away: 'Arizona State', homeP4: true, awayP4: true },
    { home: 'Penn State', away: 'Rutgers', homeP4: true, awayP4: true },
    { home: 'LSU', away: 'Texas A&M', homeP4: true, awayP4: true },
    { home: 'Notre Dame', away: 'Stanford', homeP4: true, awayP4: true },
    { home: 'Iowa', away: 'Nebraska', homeP4: true, awayP4: true },
    { home: 'TCU', away: 'Baylor', homeP4: true, awayP4: true },
  ],
  14: [
    { home: 'Alabama', away: 'Georgia', homeP4: true, awayP4: true },
    { home: 'Ohio State', away: 'Michigan', homeP4: true, awayP4: true },
    { home: 'Texas', away: 'Oklahoma', homeP4: true, awayP4: true },
    { home: 'Clemson', away: 'Florida State', homeP4: true, awayP4: true },
    { home: 'Oregon', away: 'USC', homeP4: true, awayP4: true },
    { home: 'Penn State', away: 'Iowa', homeP4: true, awayP4: true },
    { home: 'LSU', away: 'Auburn', homeP4: true, awayP4: true },
    { home: 'Notre Dame', away: 'Tennessee', homeP4: true, awayP4: true },
    { home: 'Michigan State', away: 'Northwestern', homeP4: true, awayP4: true },
    { home: 'Kansas State', away: 'Iowa State', homeP4: true, awayP4: true },
  ],
};

function getMatchupType(homeP4, awayP4) {
  if (homeP4 && awayP4) return 'p4_vs_p4';
  if (homeP4 && !awayP4) return 'p4_vs_nonp4';
  return 'nonp4_vs_p4';
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  await Game.deleteMany({ season: SEASON });
  console.log('🗑  Cleared existing 2026 games');

  let total = 0;
  for (const [weekStr, games] of Object.entries(WEEKLY_GAMES)) {
    const week = parseInt(weekStr);
    const docs = games.map(g => ({
      season: SEASON,
      week,
      homeTeam: g.home,
      awayTeam: g.away,
      homeIsPower4: g.homeP4,
      awayIsPower4: g.awayP4,
      matchupType: getMatchupType(g.homeP4, g.awayP4),
    }));
    await Game.insertMany(docs);
    total += docs.length;

    const upsetEligible = docs.filter(d => d.matchupType !== 'p4_vs_p4').map(d => d.homeIsPower4 ? d.homeTeam : d.awayTeam);
    console.log(`  Week ${week}: ${docs.length} games, upset eligible: ${upsetEligible.join(', ') || 'none'}`);
  }

  console.log(`\n✅ Done. ${total} test games inserted for 2026 season.`);
  console.log('⚠  This is TEST DATA. Re-run seedSchedule.js when CFBD publishes real 2026 schedules.');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
