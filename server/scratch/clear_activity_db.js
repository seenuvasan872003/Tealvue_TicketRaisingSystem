const mongoose = require('mongoose');
require('dotenv').config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tealvue_tickets');
  console.log('DB connected');

  const UserActivityLog = require('../models/UserActivityLog');
  const UserSession = require('../models/UserSession');
  const UserTriggerSummary = require('../models/UserTriggerSummary');

  const dl = await UserActivityLog.deleteMany({});
  const ds = await UserSession.deleteMany({});
  const dt = await UserTriggerSummary.deleteMany({});

  console.log('Cleared Activity Logs:', dl.deletedCount);
  console.log('Cleared Sessions:', ds.deletedCount);
  console.log('Cleared Summaries:', dt.deletedCount);

  await mongoose.disconnect();
};

run();
