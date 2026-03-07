/**
 * seedAdmin.js
 * Run once after first deploy to create the commissioner account.
 * Usage: node -r dotenv/config utils/seedAdmin.js
 *
 * Set these env vars or pass inline:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME, ADMIN_DISPLAY_NAME
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected');

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const username = process.env.ADMIN_USERNAME || 'commissioner';
  const displayName = process.env.ADMIN_DISPLAY_NAME || 'Commissioner';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
    process.exit(1);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    existing.isAdmin = true;
    existing.emailVerified = true;
    await existing.save();
    console.log(`✅ Updated existing user ${email} to admin`);
  } else {
    const user = new User({
      email, password, username, displayName,
      isAdmin: true, emailVerified: true, isActive: true,
    });
    await user.save();
    console.log(`✅ Created admin account: ${email}`);
  }

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
