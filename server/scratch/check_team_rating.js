const mongoose = require('mongoose');

const run = async () => {
  require('dotenv').config();
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tealvue_tickets');
  console.log('Connected');

  const Team = require('../models/Team');
  const team = await Team.findById('6a3b5b1d3950f400fb31b788');
  if (team) {
    console.log('Team Rating Info:', {
      _id: team._id,
      name: team.name,
      averageRating: team.averageRating,
      totalFeedbacks: team.totalFeedbacks,
      ratingBreakdown: team.ratingBreakdown
    });
  } else {
    console.log('Team not found');
  }

  await mongoose.disconnect();
};

run();
