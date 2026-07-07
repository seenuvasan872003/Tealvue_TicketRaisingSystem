const mongoose = require('mongoose');

const run = async () => {
  require('dotenv').config();
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tealvue_tickets');
  console.log('Connected');

  const ClientLog = require('../models/ClientLog');
  const logs = await ClientLog.find({
    userId: '6a3a22260516de99e3d29920',
    api: { $ne: '/notifications/unread-count' }
  }).sort({ _id: -1 }).limit(20);

  logs.forEach(l => {
    console.log(`[${l.timestamp}] API: ${l.api} | Status: ${l.status} | Action: ${l.action} | Msg: ${l.message}`);
  });

  await mongoose.disconnect();
};

run();
