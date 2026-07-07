const mongoose = require('mongoose');

const run = async () => {
  require('dotenv').config();
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tealvue_tickets');
  console.log('Connected to DB');

  const User = require('../models/User');
  const RoleFeature = require('../models/RoleFeature');
  const ROLE_DEFAULTS = require('../config/roleDefaults');

  // Find all users
  const users = await User.find({});
  console.log(`Found ${users.length} users to sync.`);

  for (const user of users) {
    const defaults = ROLE_DEFAULTS[user.role] || [];
    if (defaults.length === 0) continue;

    let rf = await RoleFeature.findOne({ userId: user._id });
    if (!rf) {
      rf = new RoleFeature({ userId: user._id, role: user.role, features: [] });
    } else {
      rf.role = user.role;
    }

    // Find features in defaults that are missing from user's current features
    const missing = defaults.filter(f => !rf.features.includes(f));
    if (missing.length > 0) {
      rf.features = [...rf.features, ...missing];
      await rf.save();
      console.log(`Synced user ${user.name} (${user.role}) -> added missing features:`, missing);
    }
  }

  // Also reset seenuvasan's security block
  const seenu = await User.findOne({ name: /seenuvasan/i });
  if (seenu) {
    seenu.securityFlags = 0;
    seenu.securityBlockUntil = null;
    await seenu.save();
    console.log('Unblocked seenuvasan.');
  }

  console.log('Sync complete.');
  await mongoose.disconnect();
};

run();
