const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String, required: true, unique: true,
    trim: true, minlength: 3, maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String, required: true, unique: true,
    lowercase: true, trim: true
  },
  password: { type: String, required: true, minlength: 6 },
  displayName: { type: String, required: true, trim: true, maxlength: 40 },
  avatarUrl: { type: String, default: null },

  // Account status
  isAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerifyExpires: Date,

  // Invite tracking
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Season stats (denormalized for fast leaderboard queries)
  season: { type: Number, default: () => parseInt(process.env.CURRENT_SEASON || '2026') },
  seasonPoints: { type: Number, default: 0 },
  weeklyPoints: [{
    _id: false,
    week: Number,
    points: Number,
    rank: Number,
  }],

  // Core rule enforcement: each team can only be used ONCE per season total
  // (whether for a win pick or an upset pick)
  usedTeams: [{ type: String }],

  // Payment — handled outside app, just a flag
  hasPaid: { type: Boolean, default: false },

  // Randy opt-out per season (not used in current spec but easy to add)
  randyEnabled: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
  lastLoginAt: Date,
}, { timestamps: false });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublic = function () {
  const o = this.toObject();
  delete o.password;
  delete o.emailVerifyToken;
  delete o.emailVerifyExpires;
  return o;
};

// Strip sensitive fields from JSON output automatically
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.emailVerifyToken;
    delete ret.emailVerifyExpires;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
