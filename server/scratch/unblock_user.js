const mongoose = require('mongoose');

const run = async () => {
  require('dotenv').config();
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://seenuvasan:seenu872003@gowhats.zityss7.mongodb.net/tealvue_tickets');
  console.log('Connected');

  const User = require('../models/User');
  const user = await User.findOne({ name: /seenuvasan/i });
  if (user) {
    user.securityFlags = 0;
    user.securityBlockUntil = null;
    await user.save();
    console.log('User seenuvasan has been successfully UNBLOCKED!');
  } else {
    console.log('User not found');
  }

  await mongoose.disconnect();
};

run();
