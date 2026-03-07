const mongoose = require('mongoose');

const pickSchema = new mongoose.Schema({
  _id: false,
  team: { type: String, required: true },
  pickType: {
    type: String,
    enum: ['win_vs_power4', 'upset_loss'],
    required: true,
  },
  // Filled in by admin/auto-scorer
  result: {
    type: String,
    enum: ['pending', 'correct', 'incorrect'],
    default: 'pending',
  },
  pointsEarned: { type: Number, default: 0 },
});

const weeklyPickSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  season: { type: Number, required: true, default: 2026 },
  week:   { type: Number, required: true, min: 1, max: 14 },

  picks: [pickSchema],

  // Randy flag
  wasRandyd: { type: Boolean, default: false },

  // Scoring state
  isScored:  { type: Boolean, default: false },
  isLocked:  { type: Boolean, default: false },   // locked after finalize
  totalPoints: { type: Number, default: 0 },
  weekRank:  { type: Number, default: null },

  // Commissioner manual adjustments (for transparency in history)
  commissionerAdjustments: [{
    _id: false,
    delta:    { type: Number, required: true },   // e.g. +1 or -0.5
    reason:   { type: String, default: '' },
    byAdmin:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at:       { type: Date, default: Date.now },
  }],

  submittedAt:   { type: Date, default: Date.now },
  lastModifiedAt: { type: Date, default: Date.now },
}, { timestamps: false });

// One submission per user per week per season
weeklyPickSchema.index({ user: 1, season: 1, week: 1 }, { unique: true });
// Fast leaderboard queries
weeklyPickSchema.index({ season: 1, week: 1, totalPoints: -1 });

weeklyPickSchema.methods.recalcTotal = function () {
  const pickPts = this.picks.reduce((sum, p) => sum + p.pointsEarned, 0);
  const adjPts  = (this.commissionerAdjustments || []).reduce((sum, a) => sum + a.delta, 0);
  this.totalPoints = pickPts + adjPts;
  return this.totalPoints;
};

module.exports = mongoose.model('WeeklyPick', weeklyPickSchema);
