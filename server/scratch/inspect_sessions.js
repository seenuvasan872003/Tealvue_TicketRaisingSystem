const mongoose = require('mongoose');
require('dotenv').config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tealvue_tickets');
  console.log('DB connected');

  const UserSession = require('../models/UserSession');

  const sessions = await UserSession.find().sort({ loginAt: -1 }).limit(10);
  console.log('Latest 10 Sessions:', sessions);

  await mongoose.disconnect();
};

run();
