const mongoose = require('mongoose');

// ── WEEK CONFIG ────────────────────────────────────────────────────────────────
const weekConfigSchema = new mongoose.Schema({
  season:  { type: Number, required: true, default: 2026 },
  week:    { type: Number, required: true, min: 1, max: 14 },
  label:   { type: String, default: '' },       // e.g. "Week 0/1"
  picksRequired: { type: Number, default: 5 },

  deadline: { type: Date, required: true },
  isOpen:   { type: Boolean, default: false },
  isScored: { type: Boolean, default: false },
  notes:    { type: String, default: '' },  // commissioner notes visible to players

  // Prize pool
  weeklyPot:      { type: Number, default: 70 },
  rolloverAmount: { type: Number, default: 0 },
  weeklyWinners: [{
    _id: false,
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    points:   Number,
    payout:   Number,
  }],

  // Recap (set when finalized)
  recap: {
    winnerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    winnerPoints:  { type: Number, default: 0 },
    biggestUpset:  { type: String, default: '' },   // team name
    randydPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    highScore:     { type: Number, default: 0 },
  },
}, { timestamps: false });

weekConfigSchema.index({ season: 1, week: 1 }, { unique: true });

// ── GAME SCHEDULE ──────────────────────────────────────────────────────────────
// Pre-loaded from CFBD each season. One doc per game involving a Power 4 team.
const gameSchema = new mongoose.Schema({
  season:  { type: Number, required: true },
  week:    { type: Number, required: true },
  gameId:  { type: Number },  // CFBD game id

  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },

  // Is each team Power 4?
  homeIsPower4: { type: Boolean, default: false },
  awayIsPower4: { type: Boolean, default: false },

  gameDate: { type: Date },

  // Filled in after game
  homeScore: { type: Number, default: null },
  awayScore: { type: Number, default: null },
  homeWon:   { type: Boolean, default: null },

  // Pre-game win probabilities from CFBD (0-1 scale)
  homeWinProb: { type: Number, default: null },
  awayWinProb: { type: Number, default: null },

  // Derived flags (pre-computed at seed time)
  // For each Power 4 team in this game:
  //   upsetEligible: true if opponent is NOT Power 4
  //   winEligible:   true if opponent IS Power 4
  matchupType: {
    type: String,
    enum: ['p4_vs_p4', 'p4_vs_nonp4', 'nonp4_vs_p4'],
    required: true,
  },
}, { timestamps: false });

gameSchema.index({ season: 1, week: 1 });
gameSchema.index({ season: 1, week: 1, homeTeam: 1 });
gameSchema.index({ season: 1, week: 1, awayTeam: 1 });

// ── INVITE ─────────────────────────────────────────────────────────────────────
const inviteSchema = new mongoose.Schema({
  token:      { type: String, required: true, unique: true },
  email:      { type: String, default: null, lowercase: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  usedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isUsed:     { type: Boolean, default: false },
  expiresAt:  { type: Date, required: true },
  createdAt:  { type: Date, default: Date.now },
});

// ── CHAT MESSAGE ───────────────────────────────────────────────────────────────
const chatMessageSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:   { type: String, required: true, maxlength: 500, trim: true },
  createdAt: { type: Date, default: Date.now },
});
chatMessageSchema.index({ createdAt: -1 });

const WeekConfig  = mongoose.model('WeekConfig', weekConfigSchema);
const Game        = mongoose.model('Game', gameSchema);
const Invite      = mongoose.model('Invite', inviteSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = { WeekConfig, Game, Invite, ChatMessage };
