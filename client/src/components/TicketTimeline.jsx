import React, { useEffect, useState } from 'react';
import { getTicketLogs, getTicketTimeSummary } from '../services/ticketApi';
import { 
  Plus, Target, RefreshCw, Calendar, AlertTriangle, 
  Play, XCircle, UserCheck, Unlock, Clock, CheckCircle2, 
  MessageSquare, Flag, Cpu, ShieldAlert, ShieldX
} from 'lucide-react';

const ACTION_ICONS = {
  TICKET_CREATED: Plus,
  TICKET_AUTO_ALLOCATED_TEAM: Cpu,
  TICKET_MANUALLY_ALLOCATED_TEAM: Target,
  TICKET_REALLOCATED_TEAM: RefreshCw,
  PRIORITY_CHANGED: ShieldAlert,
  DUE_DATE_SET: Calendar,
  DUE_DATE_UPDATED: Calendar,
  TICKET_SUSPENDED: AlertTriangle,
  TICKET_RESTORED: Play,
  TICKET_REJECTED: ShieldX,
  TICKET_DECLINED_BY_ADMIN: ShieldX,
  TICKET_ASSIGNED_TO_MEMBER: UserCheck,
  TICKET_REASSIGNED_TO_MEMBER: UserCheck,
  TICKET_OPENED: Unlock,
  TICKET_IN_PROGRESS: Play,
  TICKET_CLOSED: CheckCircle2,
  COMMENT_ADDED: MessageSquare,
  ATTACHMENT_FLAGGED: Flag,
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
          // Sort logs chronologically (oldest at the top, newest at the bottom)
          logData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
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
      <div className="flex items-center justify-center p-8 text-[var(--color-text-muted)] gap-2">
        <Clock className="spin text-[var(--color-teal)]" size={18} />
        <span>Loading ticket timeline logs...</span>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 m-0">
          <Clock size={20} className="text-[var(--color-teal)]" />
          Ticket Lifecycle Timeline
        </h3>
        <p className="text-[13px] text-[var(--color-text-muted)] mt-1.5 mb-0 mx-0">
          A complete progress tracker showing every action taken on this ticket.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="p-[30px] text-center border border-dashed border-[#252525] rounded-xl text-[var(--color-text-muted)]">
          No logs found for this ticket.
        </div>
      ) : (
        /* Timeline Container */
        <div className="relative flex flex-col gap-7 pl-2">
          
          {/* Render Chronological Log List */}
          {logs.map((log, idx) => {
            const nextLog = logs[idx + 1];
            
            // Determine if the action is manual, automatic, or a decline
            const isDecline = ['TICKET_DECLINED_BY_ADMIN', 'TICKET_REJECTED', 'TICKET_SUSPENDED', 'ATTACHMENT_FLAGGED'].includes(log.action);
            const isAutomatic = log.action === 'TICKET_AUTO_ALLOCATED_TEAM' || log.performedBy?.role === 'system' || log.performedBy?.name?.toLowerCase() === 'system';

            let themeColor = '#3fb950'; // Manual = Green
            let typeLabel = 'Manual';
            let typeBadgeStyle = { background: 'rgba(63, 185, 80, 0.12)', color: '#3fb950', border: '1px solid rgba(63, 185, 80, 0.25)', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' };

            if (isDecline) {
              themeColor = '#ef4444'; // Decline = Red
              typeLabel = 'Decline';
              typeBadgeStyle = { background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' };
            } else if (isAutomatic) {
              themeColor = '#6e7681'; // Automatic = Gray
              typeLabel = 'Automatic';
              typeBadgeStyle = { background: 'rgba(110, 118, 129, 0.12)', color: '#9ca3af', border: '1px solid rgba(110, 118, 129, 0.25)', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' };
            }

            const LogIcon = ACTION_ICONS[log.action] || Clock;
            const roleClass = ROLE_BADGES[log.performedBy?.role] || 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';

            return (
              <div key={log._id} className="flex gap-5 items-start relative z-10">
                
                {/* Connecting Line Segment overlaying the main track - colored exactly by action type */}
                {nextLog && (
                  <div 
                    className="absolute left-[13px] top-7 h-[calc(100%+28px)] w-[2px] -z-10 transition-colors duration-300"
                    style={{ 
                      background: themeColor, 
                      boxShadow: `0 0 6px ${themeColor}60`
                    }} 
                  />
                )}

                {/* Left Side Icon Dot - Glowing colored border */}
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-[#1c1c1c] shrink-0 transition-all duration-300"
                  style={{ 
                    border: `2px solid ${themeColor}`,
                    color: themeColor,
                    boxShadow: `0 0 8px ${themeColor}50`
                  }}
                >
                  <LogIcon size={13} strokeWidth={2.5} />
                </div>

                {/* Right Side Log Detail Card */}
                <div 
                  className="card flex-1 p-[18px] m-0 bg-[var(--color-card)] transition-colors duration-300"
                  style={{ 
                    border: `1px solid ${themeColor}20`
                  }}
                >
                  {/* Title & Badge Row */}
                  <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                    <div>
                      <h4 className="m-0 text-[15px] font-semibold text-white flex items-center gap-2.5">
                        {ACTION_LABELS[log.action] || log.action}
                        <span style={typeBadgeStyle}>{typeLabel}</span>
                      </h4>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {/* Performer Details Row */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] mb-3">
                    <span className="text-[var(--color-text-dim)] font-medium">{log.performedBy?.name || 'System'}</span>
                    <span className="text-[var(--color-text-muted)]">({log.performedBy?.email || 'system@tealvue.com'})</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${roleClass} inline-flex self-center`}>
                      {ROLE_LABELS[log.performedBy?.role] || log.performedBy?.role || 'System'}
                    </span>
                  </div>

                  {/* Metadata Box display */}
                  {log.metadata && (
                    <div className="flex flex-col gap-1 bg-[#141414] border border-[#202020] rounded-md px-3 py-2 text-xs">
                      {log.metadata.teamName && (
                        <div>
                          <span className="text-[var(--color-text-muted)]">Allocated Team:</span>{' '}
                          <span className="text-[var(--color-teal)] font-semibold">{log.metadata.teamName}</span>
                        </div>
                      )}
                      {log.metadata.assignedToUserName && (
                        <div>
                          <span className="text-[var(--color-text-muted)]">Assigned Agent:</span>{' '}
                          <span className="text-[#818cf8] font-semibold">{log.metadata.assignedToUserName}</span>
                        </div>
                      )}
                      {(log.metadata.previousValue || log.metadata.newValue) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#d1d5db]">
                          {log.metadata.previousValue && (
                            <>
                              <span className="text-[var(--color-text-muted)]">From:</span>
                              <span className="line-through text-[#f87171]">{log.metadata.previousValue}</span>
                            </>
                          )}
                          <span className="text-[var(--color-text-muted)]">→ To:</span>
                          <span className="text-[#3fb950] font-semibold">{log.metadata.newValue}</span>
                        </div>
                      )}
                      {log.metadata.note && (
                        <div className="italic text-[var(--color-text-dim)] mt-0.5">
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
        <div className="card p-6 flex flex-col gap-4">
          <h4 className="text-[15px] font-semibold text-white m-0 flex items-center gap-2 border-b border-[#252525] pb-3">
            <Clock size={18} className="text-[var(--color-teal)]" />
            Ticket Time Performance Analytics
          </h4>
          
          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-4 w-full">
            {/* Metric Box: Time to Allocate */}
            <div className="flex-1 min-w-0 bg-[#141414] border border-[#202020] rounded-[10px] p-[14px]">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.05em] block mb-1">
                Time to Allocate
              </span>
              <span className="text-lg font-bold text-white block">
                {timeSummary.formatted?.timeToAllocate || 'N/A'}
              </span>
              <span className="text-[9px] text-[var(--color-text-muted)] block mt-1">
                From creation to team allocation
              </span>
            </div>

            {/* Metric Box: Time to Assign */}
            <div className="flex-1 min-w-0 bg-[#141414] border border-[#202020] rounded-[10px] p-[14px]">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.05em] block mb-1">
                Time to Assign
              </span>
              <span className="text-lg font-bold text-white block">
                {timeSummary.formatted?.timeToAssign || 'N/A'}
              </span>
              <span className="text-[9px] text-[var(--color-text-muted)] block mt-1">
                From team allocation to agent assignment
              </span>
            </div>

            {/* Metric Box: Time In Progress */}
            <div className="flex-1 min-w-0 bg-[#141414] border border-[#202020] rounded-[10px] p-[14px]">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.05em] block mb-1">
                Time In-Progress
              </span>
              <span className="text-lg font-bold text-white block">
                {timeSummary.formatted?.timeInProgress || 'N/A'}
              </span>
              <span className="text-[9px] text-[var(--color-text-muted)] block mt-1">
                Active time spent resolving the issue
              </span>
            </div>

            {/* Metric Box: Time to Close */}
            <div className="flex-1 min-w-0 bg-[#141414] border border-[#202020] rounded-[10px] p-[14px]">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.05em] block mb-1">
                Total Resolution Time
              </span>
              <span className="text-lg font-bold text-[var(--color-teal)] block">
                {timeSummary.formatted?.timeToClose || 'N/A'}
              </span>
              <span className="text-[9px] text-[var(--color-text-muted)] block mt-1">
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
