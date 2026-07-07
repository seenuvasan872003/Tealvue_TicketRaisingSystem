const mongoose = require('mongoose');

const run = async () => {
  require('dotenv').config();
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tealvue_tickets');
  console.log('Connected');

  const Ticket = require('../models/Ticket');
  const Feedback = require('../models/Feedback');

  const ticket = await Ticket.findById('6a4cd80bba59c23707af51d7');
  if (ticket) {
    console.log('Ticket State:', {
      _id: ticket._id,
      title: ticket.title,
      status: ticket.status,
      user_id: ticket.user_id,
      feedbackStatus: ticket.feedbackStatus,
      closedAt: ticket.closedAt
    });
  } else {
    console.log('Ticket not found');
  }

  const fb = await Feedback.findOne({ ticketId: '6a4cd80bba59c23707af51d7' });
  console.log('Feedback Doc:', fb);

  await mongoose.disconnect();
};

run();
