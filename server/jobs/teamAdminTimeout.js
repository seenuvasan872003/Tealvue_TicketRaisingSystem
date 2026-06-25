const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const Team = require('../models/Team');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { notify } = require('../utils/notify');
const createLog = require('../utils/createLog');

const startTeamAdminTimeoutJob = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log('[CRON] Running Team Admin Inactivity Timeout Checks...');
    try {
      const now = new Date();
      const cutoff10Min = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago

      // Find tickets allocated to a team admin, not yet viewed, and exceeded 10 minutes
      const idleTickets = await Ticket.find({
        allocationStatus: 'allocated_team_admin',
        teamAdminViewedAt: null,
        autoAllocatedAt: { $lte: cutoff10Min },
        status: { $ne: 'closed' }
      });

      if (idleTickets.length > 0) {
        console.log(`[CRON] Found ${idleTickets.length} idle tickets waiting for agent allocation due to Team Admin inactivity.`);
      }

      for (const ticket of idleTickets) {
        if (!ticket.teamId) continue;
        const team = await Team.findById(ticket.teamId);
        if (!team) continue;

        // Find active team users belonging to this team
        const teamUsers = await User.find({
          _id: { $in: team.members },
          role: 'team_user',
          isActive: true
        });

        if (teamUsers.length === 0) {
          console.log(`[CRON] No active agents found in team "${team.name}" for ticket ${ticket._id}`);
          continue;
        }

        // Calculate workload for each agent (count of active/in-progress/open tickets)
        const workloads = [];
        for (const tu of teamUsers) {
          const activeCount = await Ticket.countDocuments({
            assignedToUser: tu._id,
            status: { $ne: 'closed' }
          });
          workloads.push({ agent: tu, count: activeCount });
        }

        // Sort by workload ascending (lowest workload agent first)
        workloads.sort((a, b) => a.count - b.count);
        const selectedAgent = workloads[0].agent;

        const allocationTime = new Date();
        
        // Allocate the ticket to the agent
        ticket.assignedToUser = selectedAgent._id;
        ticket.allocationStatus = 'allocated_team_user';
        ticket.teamUserAllocatedAt = allocationTime;
        ticket.status = 'in-progress'; // auto-transition to in-progress

        // Update time tracking
        ticket.timeTracking.memberAssignedAt = allocationTime;
        ticket.timeTracking.inProgressAt = allocationTime;
        if (ticket.timeTracking.allocatedAt) {
          ticket.timeTracking.timeToAssign = allocationTime - ticket.timeTracking.allocatedAt;
        }

        await ticket.save();

        // Detailed logs for admin/super-admin
        await ActivityLog.create({
          action: 'AUTO_ALLOCATED',
          ticketId: ticket._id,
          teamId: team._id,
          userId: selectedAgent._id,
          note: `team admin auto allocketed to team users: allocated agent "${selectedAgent.name}" (workload: ${workloads[0].count} tickets) due to Team Admin inactivity`
        });

        const systemPerformer = {
          _id: '000000000000000000000000',
          name: 'System',
          email: 'system@tealvue.com',
          role: 'system'
        };

        // This will show to users as "team admin auto allocketed to team users" due to our log translation helper
        await createLog({
          ticketId: ticket._id,
          action: 'AUTO_ALLOCATED_TEAM_USER_AFTER_TIMEOUT',
          performedBy: systemPerformer,
          metadata: {
            assignedToUserId: selectedAgent._id,
            assignedToUserName: selectedAgent.name,
            teamId: team._id,
            teamName: team.name,
            note: `team admin auto allocketed to team users: allocated agent "${selectedAgent.name}" (workload: ${workloads[0].count} tickets) due to Team Admin inactivity`
          }
        });

        await createLog({
          ticketId: ticket._id,
          action: 'TICKET_IN_PROGRESS',
          performedBy: systemPerformer,
          metadata: {
            assignedToUserName: selectedAgent.name,
            note: 'Status changed to in-progress after auto-allocation to agent',
          }
        });

        // Notify the assigned agent
        await notify({
          recipientIds: [selectedAgent._id],
          senderId:     '000000000000000000000000',
          senderName:   'System',
          senderRole:   'system',
          type:         'TICKET_ALLOCATED_TO_TEAM_USER',
          ticketId:     ticket._id,
          ticketTitle:  ticket.title,
          message:      `Ticket "${ticket.title}" has been auto-assigned to you.`
        });

        // Notify the bypassed Team Admin
        if (team.teamAdmin) {
          await notify({
            recipientIds: [team.teamAdmin],
            senderId:     '000000000000000000000000',
            senderName:   'System',
            senderRole:   'system',
            type:         'TICKET_REASSIGNED_TO_MEMBER',
            ticketId:     ticket._id,
            ticketTitle:  ticket.title,
            message:      `Ticket "${ticket.title}" was auto-allocated to agent "${selectedAgent.name}" after 10-min view timeout.`
          });
        }

        console.log(`[CRON] Ticket ${ticket._id} auto-allocated to agent ${selectedAgent.name} (Team: ${team.name}) due to Team Admin inactivity.`);
      }

    } catch (error) {
      console.error('[CRON ERROR] Team Admin inactivity timeout check failed:', error.message);
    }
  });
  console.log('⏰ Team Admin Inactivity Timeout Job Initialized (Checks every minute with 10-min threshold)');
};

module.exports = { startTeamAdminTimeoutJob };
