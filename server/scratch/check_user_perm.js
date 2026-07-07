const mongoose = require('mongoose');

const run = async () => {
  require('dotenv').config();
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://seenuvasan:seenu872003@gowhats.zityss7.mongodb.net/tealvue_tickets');
  console.log('Connected');

  const User = require('../models/User');
  const RoleFeature = require('../models/RoleFeature');

  const user = await User.findOne({ name: /seenuvasan/i });
  if (!user) {
    console.log('User not found');
    await mongoose.disconnect();
    return;
  }
  console.log('User Info:', {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isApproved: user.isApproved,
    securityFlags: user.securityFlags,
    securityBlockUntil: user.securityBlockUntil
  });

  const rf = await RoleFeature.findOne({ userId: user._id });
  console.log('RoleFeature Info:', rf ? rf.features : 'None');

  await mongoose.disconnect();
};

run();
