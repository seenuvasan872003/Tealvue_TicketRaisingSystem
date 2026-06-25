const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const Team = require('../models/Team');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { notify } = require('../utils/notify');
const createLog = require('../utils/createLog');

const startAutoAllocation = () => {
  // Run every minute for responsive auto-allocation checks
  cron.schedule('* * * * *', async () => {
    console.log('[CRON] Running Auto-Allocation Checks...');
    try {
      const now = new Date();
      const cutoff10Min = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago

      // ─── RULE 1: Admin Inactivity Auto-Allocation to Team (10 Minutes Wait) ───
      // Find tickets that have no team allocated (teamId is null), are not closed,
      // and were created at least 10 minutes ago (Admin hasn't viewed/allocated them).
      const unallocatedTickets = await Ticket.find({
        teamId: null,
        status: { $ne: 'closed' },
        createdAt: { $lte: cutoff10Min }
      });

      if (unallocatedTickets.length > 0) {
        console.log(`[CRON] Found ${unallocatedTickets.length} unallocated tickets waiting for team assignment (10-min Admin inactivity).`);
      }

      for (const ticket of unallocatedTickets) {
        // Find all active teams
        const activeTeams = await Team.find({ isActive: true });
        
        // Match team by category (case-insensitive)
        const matchedTeam = activeTeams.find(t => 
          t.categories?.map(c => c.toLowerCase()).includes(ticket.category?.toLowerCase())
        );

        if (!matchedTeam) {
          console.log(`[CRON] No active matching team found for category "${ticket.category}" on ticket ${ticket._id}. Skipping.`);
          continue;
        }

        const allocationTime = new Date();
        ticket.teamId = matchedTeam._id;
        ticket.allocatedAt = allocationTime;
        ticket.autoAllocated = true;

        // Update time tracking
        ticket.timeTracking.allocatedAt = allocationTime;
        ticket.timeTracking.timeToAllocate = allocationTime - ticket.createdAt;

        await ticket.save();

        // Log the activity
        await ActivityLog.create({
          action: 'AUTO_ALLOCATED',
          ticketId: ticket._id,
          teamId: matchedTeam._id,
          note: `admin auto allocketed to the team: allocated team "${matchedTeam.name}" based on category "${ticket.category}" due to Admin inactivity`
        });

        // Write lifecycle log
        const systemPerformer = {
          _id: '000000000000000000000000',
          name: 'System',
          email: 'system@tealvue.com',
          role: 'system'
        };

        await createLog({
          ticketId: ticket._id,
          action: 'TICKET_AUTO_ALLOCATED_TEAM',
          performedBy: systemPerformer,
          metadata: {
            teamId: matchedTeam._id,
            teamName: matchedTeam.name,
            note: `admin auto allocketed to the team: allocated team "${matchedTeam.name}" due to Admin inactivity`
          }
        });

        // Notify Team Admin
        await notify({
          recipientIds: [matchedTeam.teamAdmin],
          senderId:     '000000000000000000000000',
          senderName:   'System',
          senderRole:   'system',
          type:         'TICKET_ALLOCATED_TO_TEAM',
          ticketId:     ticket._id,
          ticketTitle:  ticket.title,
          message:      `Ticket "${ticket.title}" has been auto-allocated to your team.`
        });

        console.log(`[CRON] Ticket ${ticket._id} auto-allocated to team "${matchedTeam.name}" due to Admin inactivity.`);
      }


      // ─── RULE 2: Team Admin Inactivity Auto-Allocation to Agent (10 Minutes Wait) ───
      // Find tickets assigned to a team, but not yet allocated to any agent (assignedToUser is null),
      // and have been sitting in this state for > 10 minutes.
      const idleTickets = await Ticket.find({
        teamId: { $ne: null },
        assignedToUser: null,
        status: { $ne: 'closed' },
        $or: [
          { allocatedAt: { $lte: cutoff10Min } },
          { allocatedAt: null, createdAt: { $lte: cutoff10Min } }
        ]
      });

      if (idleTickets.length > 0) {
        console.log(`[CRON] Found ${idleTickets.length} idle tickets waiting for agent allocation (10-min Team Admin inactivity).`);
      }

      for (const ticket of idleTickets) {
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
        
        // Allocate the ticket
        ticket.assignedToUser = selectedAgent._id;
        ticket.status = 'in-progress'; // auto-transition to in-progress

        // Update time tracking
        ticket.timeTracking.memberAssignedAt = allocationTime;
        ticket.timeTracking.inProgressAt = allocationTime;
        if (ticket.timeTracking.allocatedAt) {
          ticket.timeTracking.timeToAssign = allocationTime - ticket.timeTracking.allocatedAt;
        }

        await ticket.save();

        // Log the action
        await ActivityLog.create({
          action: 'AUTO_ALLOCATED',
          ticketId: ticket._id,
          teamId: team._id,
          userId: selectedAgent._id,
          note: `team admin auto allocketed to team users: allocated agent "${selectedAgent.name}" (workload: ${workloads[0].count} tickets) due to Team Admin inactivity`
        });

        // Write lifecycle logs
        const systemPerformer = {
          _id: '000000000000000000000000',
          name: 'System',
          email: 'system@tealvue.com',
          role: 'system'
        };

        await createLog({
          ticketId: ticket._id,
          action: 'TICKET_ASSIGNED_TO_MEMBER',
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

        // Create Database Notification
        await notify({
          recipientIds: [selectedAgent._id],
          senderId:     '000000000000000000000000',
          senderName:   'System',
          senderRole:   'system',
          type:         'TICKET_ALLOCATED_TO_TEAM_USER',
          ticketId:     ticket._id,
          ticketTitle:  ticket.title,
          message:      `Ticket "${ticket.title}" has been assigned to you.`
        });

        console.log(`[CRON] Ticket ${ticket._id} auto-allocated to agent ${selectedAgent.name} (Team: ${team.name}) due to Team Admin inactivity.`);
      }

    } catch (error) {
      console.error('[CRON ERROR] Auto-allocation check failed:', error.message);
    }
  });
  console.log('⏰ Auto-Allocation Cron Job Initialized (Checks every minute with 10-min thresholds)');
};

module.exports = { startAutoAllocation };
