import React, { useEffect, useState } from 'react';
import { getTicketLogs, getTicketTimeSummary } from '../services/ticketApi';
import { 
  Plus, Target, RefreshCw, Calendar, AlertTriangle, 
  Play, XCircle, UserCheck, Unlock, Clock, CheckCircle2, 
  MessageSquare, Flag, Cpu, ShieldAlert, ShieldX
} from 'lucide-react';

const ACTION_ICONS = {
  TICKET_CREATED: { Icon: Plus, color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  TICKET_AUTO_ALLOCATED_TEAM: { Icon: Cpu, color: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' },
  TICKET_MANUALLY_ALLOCATED_TEAM: { Icon: Target, color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  TICKET_REALLOCATED_TEAM: { Icon: RefreshCw, color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  PRIORITY_CHANGED: { Icon: ShieldAlert, color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  DUE_DATE_SET: { Icon: Calendar, color: 'bg-sky-500/20 text-sky-400 border border-sky-500/30' },
  DUE_DATE_UPDATED: { Icon: Calendar, color: 'bg-sky-500/20 text-sky-400 border border-sky-500/30' },
  TICKET_SUSPENDED: { Icon: AlertTriangle, color: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
  TICKET_RESTORED: { Icon: Play, color: 'bg-teal-500/20 text-teal-400 border border-teal-500/30' },
  TICKET_REJECTED: { Icon: ShieldX, color: 'bg-rose-600/20 text-rose-400 border border-rose-600/30' },
  TICKET_DECLINED_BY_ADMIN: { Icon: ShieldX, color: 'bg-rose-600/20 text-rose-400 border border-rose-600/30' },
  TICKET_ASSIGNED_TO_MEMBER: { Icon: UserCheck, color: 'bg-violet-500/20 text-violet-400 border border-violet-500/30' },
  TICKET_REASSIGNED_TO_MEMBER: { Icon: UserCheck, color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  TICKET_OPENED: { Icon: Unlock, color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  TICKET_IN_PROGRESS: { Icon: Play, color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  TICKET_CLOSED: { Icon: CheckCircle2, color: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
  COMMENT_ADDED: { Icon: MessageSquare, color: 'bg-pink-500/20 text-pink-400 border border-pink-500/30' },
  ATTACHMENT_FLAGGED: { Icon: Flag, color: 'bg-red-600/20 text-red-400 border border-red-600/30' },
};

const ACTION_LABELS = {
  TICKET_CREATED: 'Ticket Created',
  TICKET_AUTO_ALLOCATED_TEAM: 'Team Auto-Allocated',
  TICKET_MANUALLY_ALLOCATED_TEAM: 'Team Allocated Manually',
  TICKET_REALLOCATED_TEAM: 'Team Reallocated',
  PRIORITY_CHANGED: 'Priority Changed',
  DUE_DATE_SET: 'Due Date Set',
  DUE_DATE_UPDATED: 'Due Date Updated',
  TICKET_SUSPENDED: 'Ticket Suspended',
  TICKET_RESTORED: 'Ticket Restored',
  TICKET_REJECTED: 'Ticket Rejected',
  TICKET_DECLINED_BY_ADMIN: 'Ticket Declined by Admin',
  TICKET_ASSIGNED_TO_MEMBER: 'Agent Allocated',
  TICKET_REASSIGNED_TO_MEMBER: 'Agent Reallocated',
  TICKET_OPENED: 'Ticket Opened',
  TICKET_IN_PROGRESS: 'Work Started',
  TICKET_CLOSED: 'Ticket Closed & Resolved',
  COMMENT_ADDED: 'Comment Added',
  ATTACHMENT_FLAGGED: 'Attachment Flagged',
};

const ROLE_LABELS = {
  'super-admin': 'Super Admin',
  super_admin: 'Super Admin',
  admin: 'Admin',
  team_admin: 'Team Admin',
  team_user: 'Agent',
  user: 'User',
  system: 'System',
};

const ROLE_BADGES = {
  super_admin: 'bg-red-500/10 text-red-400 border border-red-500/20',
  'super-admin': 'bg-red-500/10 text-red-400 border border-red-500/20',
  admin: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  team_admin: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  team_user: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  user: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  system: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const allowedUserActions = [
  'TICKET_CREATED',
  'TICKET_OPENED',
  'TICKET_IN_PROGRESS',
  'TICKET_CLOSED',
  'TICKET_SUSPENDED',
  'TICKET_RESTORED',
  'TICKET_REJECTED',
  'TICKET_DECLINED_BY_ADMIN'
];

const TicketTimeline = ({ ticketId, isUserView = false }) => {
  const [logs, setLogs] = useState([]);
  const [timeSummary, setTimeSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        const [logsRes, summaryRes] = await Promise.allSettled([
          getTicketLogs(ticketId),
          getTicketTimeSummary(ticketId)
        ]);

        if (logsRes.status === 'fulfilled') {
          let logData = logsRes.value.data || [];
          if (isUserView) {
            logData = logData.filter(log => allowedUserActions.includes(log.action));
          }
          setLogs(logData);
        }

        if (summaryRes.status === 'fulfilled') {
          setTimeSummary(summaryRes.value.data);
        }
      } catch (err) {
        console.error('Error fetching ticket timeline details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimelineData();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 space-x-2 text-zinc-400">
        <Clock className="w-5 h-5 animate-spin text-teal-400" />
        <span>Loading ticket timeline logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-8">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-400" />
          Ticket Lifecycle Timeline
        </h3>
        <p className="text-sm text-zinc-400">
          A complete historical record of all actions taken on this ticket.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 bg-zinc-900/20">
          No logs found for this ticket.
        </div>
      ) : (
        <div className="relative border-l border-zinc-800 ml-4 pl-6 space-y-6">
          {logs.map((log) => {
            const actionConfig = ACTION_ICONS[log.action] || { Icon: Clock, color: 'bg-zinc-500/20 text-zinc-400' };
            const ActionIcon = actionConfig.Icon;
            const roleClass = ROLE_BADGES[log.performedBy?.role] || 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';

            return (
              <div key={log._id} className="relative group">
                {/* Timeline Dot Icon */}
                <div className={`absolute -left-[37px] top-1.5 w-7 h-7 rounded-full flex items-center justify-center ${actionConfig.color} shadow-lg transition-transform duration-200 group-hover:scale-110`}>
                  <ActionIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>

                {/* Log Card Content */}
                <div className="bg-[#1c2128] border border-zinc-800/80 rounded-xl p-4 shadow-sm hover:border-zinc-700/60 transition-colors duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-white text-sm sm:text-base">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {/* Performer info */}
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="text-zinc-400 font-medium">{log.performedBy?.name || 'Unknown'}</span>
                    <span className="text-zinc-500">({log.performedBy?.email})</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${roleClass}`}>
                      {ROLE_LABELS[log.performedBy?.role] || log.performedBy?.role}
                    </span>
                  </div>

                  {/* Metadata display */}
                  {log.metadata && (
                    <div className="space-y-1.5 border-t border-zinc-800/60 pt-2 text-xs sm:text-sm text-zinc-300">
                      {log.metadata.teamName && (
                        <div>
                          <span className="text-zinc-500 font-medium">Allocated Team:</span>{' '}
                          <span className="text-teal-400 font-semibold">{log.metadata.teamName}</span>
                        </div>
                      )}
                      {log.metadata.assignedToUserName && (
                        <div>
                          <span className="text-zinc-500 font-medium">Assigned Agent:</span>{' '}
                          <span className="text-violet-400 font-semibold">{log.metadata.assignedToUserName}</span>
                        </div>
                      )}
                      {(log.metadata.previousValue || log.metadata.newValue) && (
                        <div className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded border border-zinc-800/30">
                          {log.metadata.previousValue && (
                            <>
                              <span className="text-zinc-500 font-medium">From:</span>
                              <span className="line-through text-red-400">{log.metadata.previousValue}</span>
                            </>
                          )}
                          <span className="text-zinc-500 font-medium">→ To:</span>
                          <span className="text-green-400 font-semibold">{log.metadata.newValue}</span>
                        </div>
                      )}
                      {log.metadata.note && (
                        <div className="italic text-zinc-400 bg-zinc-900/20 p-2.5 rounded-lg border border-zinc-800/40 mt-1">
                          "{log.metadata.note}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Time Summary Panel */}
      {timeSummary && (
        <div className="bg-gradient-to-br from-[#1c2128] to-[#14191f] border border-zinc-800 rounded-2xl p-6 shadow-md mt-6">
          <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Clock className="w-5 h-5 text-teal-400" />
            Ticket Time Performance Analytics
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric Box: Time to Allocate */}
            <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block mb-1">
                Time to Allocate
              </span>
              <span className="text-lg font-bold text-white block">
                {timeSummary.formatted?.timeToAllocate || 'N/A'}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-1">
                From creation to team allocation
              </span>
            </div>

            {/* Metric Box: Time to Assign */}
            <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block mb-1">
                Time to Assign
              </span>
              <span className="text-lg font-bold text-white block">
                {timeSummary.formatted?.timeToAssign || 'N/A'}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-1">
                From team allocation to agent assignment
              </span>
            </div>

            {/* Metric Box: Time In Progress */}
            <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block mb-1">
                Time In-Progress
              </span>
              <span className="text-lg font-bold text-white block">
                {timeSummary.formatted?.timeInProgress || 'N/A'}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-1">
                Active time spent resolving the issue
              </span>
            </div>

            {/* Metric Box: Time to Close */}
            <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block mb-1">
                Total Resolution Time
              </span>
              <span className="text-lg font-bold text-teal-400 block">
                {timeSummary.formatted?.timeToClose || 'N/A'}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-1">
                From creation to ticket closure
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketTimeline;
