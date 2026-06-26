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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: 'var(--color-text-muted)', gap: 8 }}>
        <Clock className="spin" size={18} style={{ color: 'var(--color-teal)' }} />
        <span>Loading ticket timeline logs...</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <Clock size={20} style={{ color: 'var(--color-teal)' }} />
          Ticket Lifecycle Timeline
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6, margin: '6px 0 0 0' }}>
          A complete progress tracker showing every action taken on this ticket.
        </p>
      </div>

      {logs.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', border: '1px dashed #252525', borderRadius: 12, color: 'var(--color-text-muted)' }}>
          No logs found for this ticket.
        </div>
      ) : (
        /* Timeline Container */
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 28, paddingLeft: 8 }}>
          
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
              <div key={log._id} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                
                {/* Connecting Line Segment overlaying the main track - colored exactly by action type */}
                {nextLog && (
                  <div style={{ 
                    position: 'absolute', 
                    left: 13, 
                    top: 28, 
                    height: 'calc(100% + 28px)', 
                    width: 2, 
                    background: themeColor, 
                    zIndex: -1,
                    boxShadow: `0 0 6px ${themeColor}60`,
                    transition: 'background 0.3s ease'
                  }} />
                )}

                {/* Left Side Icon Dot - Glowing colored border */}
                <div style={{ 
                  width: 28, 
                  height: 28, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  background: '#1c1c1c', 
                  border: `2px solid ${themeColor}`,
                  color: themeColor,
                  boxShadow: `0 0 8px ${themeColor}50`,
                  flexShrink: 0,
                  transition: 'all 0.3s ease'
                }}>
                  <LogIcon size={13} strokeWidth={2.5} />
                </div>

                {/* Right Side Log Detail Card */}
                <div className="card" style={{ 
                  flex: 1, 
                  padding: 18, 
                  margin: 0, 
                  border: `1px solid ${themeColor}20`,
                  background: 'var(--color-card)',
                  transition: 'border 0.3s ease'
                }}>
                  {/* Title & Badge Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {ACTION_LABELS[log.action] || log.action}
                        <span style={typeBadgeStyle}>{typeLabel}</span>
                      </h4>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {/* Performer Details Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11, marginBottom: 12 }}>
                    <span style={{ color: 'var(--color-text-dim)', fontWeight: 500 }}>{log.performedBy?.name || 'System'}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>({log.performedBy?.email || 'system@tealvue.com'})</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${roleClass}`} style={{ display: 'inline-flex', alignSelf: 'center' }}>
                      {ROLE_LABELS[log.performedBy?.role] || log.performedBy?.role || 'System'}
                    </span>
                  </div>

                  {/* Metadata Box display */}
                  {log.metadata && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#141414', border: '1px solid #202020', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                      {log.metadata.teamName && (
                        <div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Allocated Team:</span>{' '}
                          <span style={{ color: 'var(--color-teal)', fontWeight: 600 }}>{log.metadata.teamName}</span>
                        </div>
                      )}
                      {log.metadata.assignedToUserName && (
                        <div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Assigned Agent:</span>{' '}
                          <span style={{ color: '#818cf8', fontWeight: 600 }}>{log.metadata.assignedToUserName}</span>
                        </div>
                      )}
                      {(log.metadata.previousValue || log.metadata.newValue) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#d1d5db' }}>
                          {log.metadata.previousValue && (
                            <>
                              <span style={{ color: 'var(--color-text-muted)' }}>From:</span>
                              <span style={{ textDecoration: 'line-through', color: '#f87171' }}>{log.metadata.previousValue}</span>
                            </>
                          )}
                          <span style={{ color: 'var(--color-text-muted)' }}>→ To:</span>
                          <span style={{ color: '#3fb950', fontWeight: 600 }}>{log.metadata.newValue}</span>
                        </div>
                      )}
                      {log.metadata.note && (
                        <div style={{ fontStyle: 'italic', color: 'var(--color-text-dim)', marginTop: 2 }}>
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
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #252525', paddingBottom: 12 }}>
            <Clock size={18} style={{ color: 'var(--color-teal)' }} />
            Ticket Time Performance Analytics
          </h4>
          
          <div style={{ display: 'flex', gap: 16, width: '100%', flexWrap: 'nowrap' }}>
            {/* Metric Box: Time to Allocate */}
            <div style={{ flex: 1, minWidth: 0, background: '#141414', border: '1px solid #202020', borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', uppercase: true, letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                Time to Allocate
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', display: 'block' }}>
                {timeSummary.formatted?.timeToAllocate || 'N/A'}
              </span>
              <span style={{ fontSize: 9, color: 'var(--color-text-muted)', display: 'block', marginTop: 4 }}>
                From creation to team allocation
              </span>
            </div>

            {/* Metric Box: Time to Assign */}
            <div style={{ flex: 1, minWidth: 0, background: '#141414', border: '1px solid #202020', borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', uppercase: true, letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                Time to Assign
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', display: 'block' }}>
                {timeSummary.formatted?.timeToAssign || 'N/A'}
              </span>
              <span style={{ fontSize: 9, color: 'var(--color-text-muted)', display: 'block', marginTop: 4 }}>
                From team allocation to agent assignment
              </span>
            </div>

            {/* Metric Box: Time In Progress */}
            <div style={{ flex: 1, minWidth: 0, background: '#141414', border: '1px solid #202020', borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', uppercase: true, letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                Time In-Progress
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', display: 'block' }}>
                {timeSummary.formatted?.timeInProgress || 'N/A'}
              </span>
              <span style={{ fontSize: 9, color: 'var(--color-text-muted)', display: 'block', marginTop: 4 }}>
                Active time spent resolving the issue
              </span>
            </div>

            {/* Metric Box: Time to Close */}
            <div style={{ flex: 1, minWidth: 0, background: '#141414', border: '1px solid #202020', borderRadius: 10, padding: 14 }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', uppercase: true, letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                Total Resolution Time
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-teal)', display: 'block' }}>
                {timeSummary.formatted?.timeToClose || 'N/A'}
              </span>
              <span style={{ fontSize: 9, color: 'var(--color-text-muted)', display: 'block', marginTop: 4 }}>
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
