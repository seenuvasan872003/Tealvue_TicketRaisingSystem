const mongoose = require('mongoose');

const run = async () => {
  require('dotenv').config();
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tealvue_tickets');
  console.log('Connected to DB');

  const Team = require('../models/Team');
  const Feedback = require('../models/Feedback');
  const User = require('../models/User');

  const admin = await User.findOne({ name: /FullStack Admin/i });
  if (admin) {
    console.log('Admin Info:', { _id: admin._id, name: admin.name, role: admin.role });
    const teams = await Team.find({ teamAdmin: admin._id });
    console.log('Teams managed by admin:', teams.map(t => ({ _id: t._id, name: t.name })));
  } else {
    console.log('Admin not found');
  }

  const feedbacks = await Feedback.find({});
  console.log(`All feedbacks in DB (${feedbacks.length}):`);
  feedbacks.forEach(f => {
    console.log({
      _id: f._id,
      ticketId: f.ticketId,
      teamId: f.teamId,
      userId: f.userId,
      teamUserId: f.teamUserId,
      isSubmitted: f.isSubmitted,
      comment: f.comment
    });
  });

  await mongoose.disconnect();
};

run();
