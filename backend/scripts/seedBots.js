/**
 * seedBots.js — Generate 37 bot users with picks through week 11
 *
 * Usage:
 *   MONGODB_URI=<uri> CURRENT_SEASON=2026 node backend/scripts/seedBots.js
 *
 * Safe to re-run: skips users that already exist (by username prefix "bot_")
 * To wipe and re-seed: pass --clean flag
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User       = require('../models/User');
const WeeklyPick = require('../models/WeeklyPick');
const { ALL_TEAMS, PICKS_PER_WEEK } = require('../utils/teams');

const SEASON     = parseInt(process.env.CURRENT_SEASON || '2026');
const SEED_WEEKS = 11; // seed picks through week 11
const CLEAN      = process.argv.includes('--clean');

// ── Bot display names ────────────────────────────────────────────────────────
const BOT_NAMES = [
  'GridironGhost',    'TurfBurner',       'FourthAndForever', 'BlitzKreig99',
  'RedZoneRando',     'HailMaryHank',     'SnapCountStan',    'TwoPointPete',
  'SackMasterSam',    'OnsideOliver',     'PuntingPhil',      'FakePuntFrank',
  'DoubleWingDave',   'SpreadOffenseSteve','WildcatWendy',    'AirRaidAl',
  'WishboneWalter',   'IFormIrene',       'TripleThreatTed',  'MotionManMike',
  'ZoneReadZach',     'OptionOtto',       'ShotgunSherry',    'NoHuddleNate',
  'TwoMinuteTom',     'ClockKillerKim',   'PocketPresencePaul','ScramblingSue',
  'CheckdownChuck',   'RouteRunnerRose',  'YacYardyYvonne',   'StiffArmSteve',
  'JukeBoxJimmy',     'BlindsideBrenda',  'PullBlockerPat',
  'SeamRouteSimon',   'GoRoutineGrace',
];

// ── Pick type mix: ~75% win, ~25% upset ─────────────────────────────────────
function randomPickType() {
  return Math.random() < 0.25 ? 'upset_loss' : 'win_vs_power4';
}

// ── Result simulation ────────────────────────────────────────────────────────
// Win picks: ~62% correct. Upset picks: ~35% correct (harder).
function randomResult(pickType) {
  const r = Math.random();
  if (pickType === 'win_vs_power4') return r < 0.62 ? 'correct' : 'incorrect';
  return r < 0.35 ? 'correct' : 'incorrect';
}

function pointsForPick(pickType, result) {
  if (result !== 'correct') return 0;
  return pickType === 'upset_loss' ? 2 : 1;
}

// ── Shuffle utility ──────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Generate a full season's pick sequence for one bot ───────────────────────
function generateBotPicks() {
  // Shuffle all 68 teams, then deal them out week by week
  const teamQueue = shuffle(ALL_TEAMS);
  let idx = 0;
  const weekPicks = {};

  for (let week = 1; week <= SEED_WEEKS; week++) {
    const needed = PICKS_PER_WEEK[week] || 5;
    const picks  = [];

    for (let p = 0; p < needed; p++) {
      if (idx >= teamQueue.length) break; // shouldn't happen with 68 teams / 11 weeks
      const team     = teamQueue[idx++];
      const pickType = randomPickType();
      const result   = randomResult(pickType);
      picks.push({
        team,
        pickType,
        result,
        pointsEarned: pointsForPick(pickType, result),
      });
    }

    weekPicks[week] = picks;
  }

  return weekPicks;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  console.log(`Connecting to MongoDB (season ${SEASON})...`);
  await mongoose.connect(uri);
  console.log('Connected.\n');

  // Optional clean
  if (CLEAN) {
    console.log('--clean: removing existing bot users and their picks...');
    const bots = await User.find({ username: /^bot_/ });
    const ids  = bots.map(b => b._id);
    await WeeklyPick.deleteMany({ user: { $in: ids } });
    await User.deleteMany({ username: /^bot_/ });
    console.log(`Removed ${bots.length} bot users.\n`);
  }

  // Skip names that already exist
  const existing = new Set(
    (await User.find({ username: /^bot_/ }, 'username')).map(u => u.username)
  );

  const hashedPw = await bcrypt.hash('botpassword123', 12);
  let created = 0, skipped = 0;

  for (const displayName of BOT_NAMES) {
    const username = `bot_${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const email    = `${username}@skidoo-bot.invalid`;

    if (existing.has(username)) {
      console.log(`  skip ${username} (already exists)`);
      skipped++;
      continue;
    }

    // Create user
    const user = new User({
      username,
      email,
      password:      hashedPw,
      displayName,
      isActive:      true,
      emailVerified: true,   // bots are "verified" so they show up everywhere
      hasPaid:       true,
      season:        SEASON,
      seasonPoints:  0,
      weeklyPoints:  [],
      usedTeams:     [],
    });

    // Skip pre-save hash (password already hashed)
    user.$__reset();
    user.isNew = true;

    // Generate picks
    const weekPicks = generateBotPicks();

    let seasonTotal = 0;
    const weeklyPointsArr = [];
    const usedTeamsSet    = new Set();

    const weeklyPickDocs = [];

    for (let week = 1; week <= SEED_WEEKS; week++) {
      const picks   = weekPicks[week];
      const weekPts = picks.reduce((s, p) => s + p.pointsEarned, 0);

      picks.forEach(p => usedTeamsSet.add(p.team));
      seasonTotal += weekPts;
      weeklyPointsArr.push({ week, points: weekPts, rank: null });

      weeklyPickDocs.push({
        user:       null, // will fill after save
        season:     SEASON,
        week,
        picks,
        wasRandyd:  false,
        isScored:   true,
        isLocked:   true,
        totalPoints: weekPts,
        submittedAt: new Date(Date.now() - (SEED_WEEKS - week + 1) * 7 * 24 * 3600 * 1000),
        lastModifiedAt: new Date(),
      });
    }

    // Update user stats
    user.seasonPoints  = seasonTotal;
    user.weeklyPoints  = weeklyPointsArr;
    user.usedTeams     = [...usedTeamsSet];

    // Save user (use insertOne to bypass pre-save hook re-hashing)
    const savedUser = await User.collection.insertOne({
      ...user.toObject(),
      _id: new mongoose.Types.ObjectId(),
    });
    const userId = savedUser.insertedId;

    // Save weekly picks
    const pickInserts = weeklyPickDocs.map(d => ({ ...d, user: userId }));
    await WeeklyPick.insertMany(pickInserts, { ordered: false });

    console.log(`  ✓ ${displayName.padEnd(24)} ${seasonTotal} pts, ${user.usedTeams.length} teams used`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);

  // Quick sanity check
  const botCount = await User.countDocuments({ username: /^bot_/ });
  const pickCount = await WeeklyPick.countDocuments({
    season: SEASON,
    week:   { $lte: SEED_WEEKS },
    user:   { $in: (await User.find({ username: /^bot_/ }, '_id')).map(u => u._id) }
  });
  console.log(`\nSanity check: ${botCount} bot users, ${pickCount} weekly pick documents`);

  await mongoose.disconnect();
  console.log('Disconnected.');
}

seed().catch(err => { console.error(err); process.exit(1); });
