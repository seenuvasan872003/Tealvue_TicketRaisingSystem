const fs = require('fs');

async function fix() {
  try {
    const mongoose = require('mongoose');
    const dotenv = require('dotenv');
    dotenv.config();

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const RoleFeature = mongoose.model('RoleFeature', new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      role: String,
      features: [String]
    }, { strict: false }));

    const User = mongoose.model('User', new mongoose.Schema({
      role: String
    }, { strict: false }));

    const defaults = [
      'dashboard', 'ticket_approval', 'all_users', 'teams_management', 
      'features_management', 'role_management', 'manage_categories',
      'team_dashboard', 'ticket_lifecycle_logs', 'activity_logs', 'client_logs'
    ];

    const users = await User.find({ role: 'super-admin' });
    const userIds = users.map(u => u._id);

    await RoleFeature.updateMany(
      { userId: { $in: userIds } },
      { $set: { features: defaults } }
    );
    
    console.log(`Updated ${userIds.length} super-admins to defaults.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
