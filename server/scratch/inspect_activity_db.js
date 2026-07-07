const mongoose = require('mongoose');
require('dotenv').config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tealvue_tickets');
  console.log('DB connected');

  const User = require('../models/User');
  const UserActivityLog = require('../models/UserActivityLog');
  const UserSession = require('../models/UserSession');
  const UserTriggerSummary = require('../models/UserTriggerSummary');

  const userCount = await User.countDocuments();
  const logsCount = await UserActivityLog.countDocuments();
  const sessionCount = await UserSession.countDocuments();
  const summaryCount = await UserTriggerSummary.countDocuments();

  console.log({ userCount, logsCount, sessionCount, summaryCount });

  const latestLogs = await UserActivityLog.find().limit(5).sort({ timestamp: -1 });
  console.log('Latest logs:', latestLogs);

  const latestSummaries = await UserTriggerSummary.find().limit(5);
  console.log('Latest summaries:', latestSummaries);

  await mongoose.disconnect();
};

run();
