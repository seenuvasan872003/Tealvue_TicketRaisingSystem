const Team = require('../models/Team');
const User = require('../models/User');

const seedTeams = async () => {
  try {
    const count = await Team.countDocuments();
    if (count > 0) {
      console.log('Teams collection is not empty. Skipping seeding.');
      return;
    }

    // Find the default super admin to attribute the creation
    let adminUser = await User.findOne({ role: 'super-admin' });
    if (!adminUser) {
      adminUser = await User.findOne({ email: 'admine@gmail.com' });
    }
    const adminId = adminUser ? adminUser._id : null;

    const defaultTeamsConfig = [
      {
        name: 'TechCare Team',
        categories: ['Technical'],
        description: 'Handles technical support tickets, server issues, and hardware diagnostics.',
        adminEmail: 'techcare_admin@tealvue.com',
        adminName: 'TechCare Admin',
      },
      {
        name: 'Billing Support Team',
        categories: ['Billing'],
        description: 'Manages invoicing, refunds, subscriptions, and payment gate issues.',
        adminEmail: 'billing_admin@tealvue.com',
        adminName: 'Billing Admin',
      },
      {
        name: 'HR Connect Team',
        categories: ['HR'],
        description: 'Focuses on employee onboarding, benefits, workspace management, and inner relations.',
        adminEmail: 'hr_admin@tealvue.com',
        adminName: 'HR Admin',
      },
      {
        name: 'General Helpdesk',
        categories: ['General'],
        description: 'First level customer assistance for general inquiries and portal walkthroughs.',
        adminEmail: 'general_admin@tealvue.com',
        adminName: 'General Admin',
      },
      {
        name: 'OmniSupport Team',
        categories: ['General', 'Technical', 'Other'],
        description: 'Versatile team capable of resolving technical, general, and miscellaneous tasks.',
        adminEmail: 'omni_admin@tealvue.com',
        adminName: 'Omni Admin',
      },
      {
        name: 'FullStack Team',
        categories: ['Technical', 'Billing', 'General'],
        description: 'Specialist team resolving complex development, technical integration, and billing disputes.',
        adminEmail: 'fullstack_admin@tealvue.com',
        adminName: 'FullStack Admin',
      },
    ];

    for (const config of defaultTeamsConfig) {
      // 1. Create or find the team admin user
      let tAdmin = await User.findOne({ email: config.adminEmail });
      if (!tAdmin) {
        tAdmin = new User({
          name: config.adminName,
          email: config.adminEmail,
          password: 'password123',
          role: 'team_admin',
          isApproved: true,
          isActive: true,
        });
        await tAdmin.save();
        console.log(`👤 Created Team Admin account: ${config.adminEmail}`);
      }

      // 2. Create the Team
      const team = new Team({
        name: config.name,
        categories: config.categories,
        description: config.description,
        teamAdmin: tAdmin._id,
        members: [],
        isActive: true,
        createdBy: adminId,
      });
      await team.save();
      console.log(`👥 Created Team: ${config.name}`);
    }

    console.log('✅ Successfully seeded 6 default teams and team admins.');
  } catch (error) {
    console.error('❌ Error seeding teams:', error.message);
  }
};

module.exports = { seedTeams };
