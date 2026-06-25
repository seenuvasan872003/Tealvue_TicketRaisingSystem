// ============================================================
//  client/src/pages/UserTicketStates.jsx
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { getTickets, getTicketLogs } from '../services/ticketApi';
import { 
  Clock, Ticket, ChevronDown, ChevronUp, AlertCircle,
  PlusCircle, Eye, Users, UserCheck, PlayCircle, CheckCircle2, Calendar
} from 'lucide-react';

// Simplified Stepper Component for 7 Ticket States
const SimplifiedTicketStepper = ({ ticket }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      try {
        const { data } = await getTicketLogs(ticket._id);
        if (active) {
          setLogs(data || []);
        }
      } catch (err) {
        console.error('Error fetching ticket logs for stepper:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchLogs();
    return () => {
      active = false;
    };
  }, [ticket._id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '10px', color: 'var(--color-text-muted)' }}>
        <div className="spinner" style={{ width: 22, height: 22, border: '2px solid var(--color-teal-muted)', borderTopColor: 'var(--color-teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '13px', fontFamily: 'Roboto, sans-serif' }}>Loading ticket state timeline...</span>
      </div>
    );
  }

  if (ticket.approvalStatus === 'rejected') {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <div style={{
          background: 'rgba(248,113,113,0.05)',
          border: '1px solid rgba(248,113,113,0.18)',
          borderRadius: 8,
          padding: '24px 20px',
          color: '#f87171',
          maxWidth: 500,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12
        }}>
          <AlertCircle size={32} style={{ color: '#ef4444' }} />
          <h4 style={{ color: '#ef4444', margin: 0, fontSize: 16, fontWeight: 700 }}>Ticket Declined / Rejected</h4>
          {ticket.moderationNote && (
            <p style={{ color: '#acacac', margin: 0, fontSize: 12, fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 6 }}>
              Reason: {ticket.moderationNote}
            </p>
          )}
          <p style={{ fontSize: 14, fontWeight: 600, margin: '4px 0 0 0', color: '#fff' }}>
            This ticket has been declined. Kindly create a new ticket.
          </p>
        </div>
      </div>
    );
  }

  // 1. Ticket Created Log
  const createdLog = logs.find(l => l.action === 'TICKET_CREATED');
  const createdTime = createdLog?.timestamp || ticket.createdAt;

  // 2. Admin Seen Log
  const adminSeenLog = logs.find(l => l.action === 'TICKET_OPENED' && (l.performedBy?.role === 'admin' || l.performedBy?.role === 'super-admin'));
  const adminSeenTime = adminSeenLog?.timestamp;

  // 3. Team Allocated Log
  const teamAllocatedLog = logs.find(l => ['TICKET_AUTO_ALLOCATED_TEAM', 'TICKET_MANUALLY_ALLOCATED_TEAM', 'TICKET_REALLOCATED_TEAM', 'AUTO_ALLOCATED'].includes(l.action));
  const hasTeam = !!ticket.teamId || !!teamAllocatedLog;
  const teamAllocatedTime = teamAllocatedLog?.timestamp || (ticket.teamId ? ticket.updatedAt : null);
  const teamName = ticket.teamId?.name || teamAllocatedLog?.metadata?.teamName;

  // 4. Team Seen Log
  const teamSeenLog = logs.find(l => l.action === 'TICKET_OPENED' && l.performedBy?.role === 'team_admin');
  const teamSeenTime = teamSeenLog?.timestamp;

  // 5. Agent Allocated Log
  const agentAllocatedLog = logs.find(l => ['TICKET_ASSIGNED_TO_MEMBER', 'TICKET_REASSIGNED_TO_MEMBER', 'TICKET_ASSIGNED'].includes(l.action));
  const hasAgent = !!ticket.assignedToUser || !!agentAllocatedLog;
  const agentAllocatedTime = agentAllocatedLog?.timestamp || (ticket.assignedToUser ? ticket.updatedAt : null);
  const agentName = ticket.assignedToUser?.name || agentAllocatedLog?.metadata?.assignedToUserName;

  // 6. Agent Started Working Log
  const agentWorkingLog = logs.find(l => l.action === 'TICKET_IN_PROGRESS' || (l.action === 'TICKET_OPENED' && l.performedBy?.role === 'team_user'));
  const isWorking = ticket.status === 'in-progress' || ticket.status === 'closed' || !!agentWorkingLog;
  const workingTime = agentWorkingLog?.timestamp || (isWorking ? ticket.updatedAt : null);

  // 7. Finished Log
  const finishedLog = logs.find(l => l.action === 'TICKET_CLOSED');
  const isFinished = ticket.status === 'closed' || !!finishedLog;
  const finishedTime = finishedLog?.timestamp || (isFinished ? ticket.updatedAt : null);

  // Helper to format date & time nicely
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Define our 7 simple states
  const steps = [
    {
      id: 1,
      title: 'Ticket Created',
      icon: PlusCircle,
      completed: true,
      time: createdTime,
      description: 'Your request was successfully submitted and registered in the system.',
      details: (
        <div style={{ marginTop: '8px', padding: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '4px' }}>{ticket.title}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
        </div>
      ),
      color: 'var(--color-open)'
    },
    {
      id: 2,
      title: 'Admin Seen',
      icon: Eye,
      completed: !!adminSeenLog,
      time: adminSeenTime,
      description: adminSeenLog 
        ? `Reviewed and acknowledged by Administrator: ${adminSeenLog.performedBy?.name || 'System'}`
        : 'Waiting for an administrator to view and acknowledge your ticket.',
      color: 'var(--color-progress)'
    },
    {
      id: 3,
      title: 'Admin Allocated Team',
      icon: Users,
      completed: hasTeam,
      time: teamAllocatedTime,
      description: (ticket.autoAllocated || teamAllocatedLog?.metadata?.note?.includes('admin auto allocketed'))
        ? 'admin auto allocketed to the team'
        : hasTeam 
          ? `Assigned to specialized support team: ${teamName || 'Support Team'}`
          : 'Awaiting support team allocation based on category expertise.',
      color: '#3b82f6' // blue
    },
    {
      id: 4,
      title: 'Team Seen',
      icon: Eye,
      completed: !!teamSeenLog,
      time: teamSeenTime,
      description: teamSeenLog 
        ? `Reviewed and accepted by Team Administrator: ${teamSeenLog.performedBy?.name || 'Team Admin'}`
        : 'Waiting for the team administrator to review the allocation.',
      color: '#8b5cf6' // violet
    },
    {
      id: 5,
      title: 'Team Allocated Agent',
      icon: UserCheck,
      completed: hasAgent,
      time: agentAllocatedTime,
      description: (agentAllocatedLog?.metadata?.note?.includes('team admin auto allocketed') || agentAllocatedLog?.metadata?.note?.includes('Auto-allocated'))
        ? 'team admin auto allocketed to team users'
        : hasAgent 
          ? `Dedicated support agent assigned: ${agentName || 'Agent'}`
          : 'Awaiting a dedicated support agent assignment within the team.',
      color: '#6366f1' // indigo
    },
    {
      id: 6,
      title: 'Agent Started Working',
      icon: PlayCircle,
      completed: isWorking,
      time: workingTime,
      description: isWorking 
        ? `Support agent ${agentName || ''} is actively working on resolving your issue.`
        : 'Waiting for the assigned agent to commence technical investigation.',
      color: 'var(--color-progress)'
    },
    {
      id: 7,
      title: 'Finished State',
      icon: CheckCircle2,
      completed: isFinished,
      time: finishedTime,
      description: isFinished 
        ? 'Ticket resolved, finalized, and closed. Solution delivered.'
        : 'Waiting for resolution and final confirmation.',
      color: 'var(--color-open)'
    }
  ];

  return (
    <div style={{ padding: '24px 0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative' }}>
        
        {/* Continuous track line behind steps */}
        <div style={{
          position: 'absolute',
          left: '19px',
          top: '12px',
          bottom: '12px',
          width: '2px',
          background: 'linear-gradient(180deg, var(--color-border) 0%, var(--color-border-soft) 100%)',
          zIndex: 0
        }} />

        {/* Dynamic completed track line highlight */}
        {(() => {
          const completedStepsCount = steps.filter(s => s.completed).length;
          const percentage = ((completedStepsCount - 1) / (steps.length - 1)) * 100;
          return (
            <div style={{
              position: 'absolute',
              left: '19px',
              top: '12px',
              height: `${Math.max(0, percentage)}%`,
              width: '2px',
              background: 'linear-gradient(180deg, var(--color-open) 0%, var(--color-progress) 50%, #3b82f6 100%)',
              transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 1
            }} />
          );
        })()}

        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isCurrent = step.completed && (idx === steps.length - 1 || !steps[idx + 1].completed);
          
          return (
            <div 
              key={step.id} 
              style={{ 
                display: 'flex', 
                gap: '20px', 
                position: 'relative', 
                zIndex: 2,
                opacity: step.completed ? 1 : 0.45,
                transition: 'opacity 0.3s ease'
              }}
            >
              {/* Step Circle Indicator */}
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: step.completed ? 'var(--color-surface)' : 'var(--color-bg)',
                  border: step.completed 
                    ? `2px solid ${step.color}` 
                    : '2px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isCurrent 
                    ? `0 0 16px ${step.color}40, inset 0 0 8px ${step.color}20` 
                    : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isCurrent ? 'scale(1.1)' : 'scale(1)'
                }}
              >
                <StepIcon 
                  size={18} 
                  color={step.completed ? step.color : 'var(--color-text-muted)'} 
                  style={{ transition: 'color 0.3s' }} 
                />
              </div>

              {/* Step Content Card */}
              <div 
                style={{
                  flex: 1,
                  background: isCurrent 
                    ? 'rgba(255, 255, 255, 0.015)' 
                    : 'rgba(255, 255, 255, 0.003)',
                  border: isCurrent 
                    ? '1px solid rgba(20, 160, 125, 0.2)' 
                    : '1px solid var(--color-border-soft)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  transition: 'all 0.3s ease',
                  boxShadow: isCurrent ? '0 4px 20px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: step.completed ? 'var(--color-text)' : 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {step.title}
                    {isCurrent && (
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: '700', 
                        textTransform: 'uppercase', 
                        background: `${step.color}15`, 
                        color: step.color, 
                        padding: '2px 6px', 
                        borderRadius: '20px',
                        border: `1px solid ${step.color}30`,
                        letterSpacing: '0.05em'
                      }}>
                        Current State
                      </span>
                    )}
                  </h4>
                  {step.completed && step.time && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} /> {formatDateTime(step.time)}
                    </span>
                  )}
                </div>
                
                <p style={{ 
                  margin: 0, 
                  fontSize: '12.5px', 
                  color: step.completed ? 'var(--color-text-muted)' : 'var(--color-text-dim)', 
                  lineHeight: '1.5' 
                }}>
                  {step.description}
                </p>

                {/* Render any child content (like created ticket details) */}
                {step.completed && step.details}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
};

const UserTicketStates = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const LIMIT = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getTickets({ page, limit: LIMIT });
      setTickets(data.tickets || []);
      setPages(data.pages || 1);
    } catch (e) {
      console.error('[UserTicketStates] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = (ticketId) => {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
    } else {
      setExpandedTicketId(ticketId);
    }
  };

  const getStatusBadgeStyle = (t) => {
    if (t.approvalStatus === 'rejected') {
      return { background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
    }
    switch (t.status) {
      case 'open':
        return { background: 'var(--color-open-bg)', color: 'var(--color-open)', border: '1px solid rgba(63,185,80,0.18)' };
      case 'in-progress':
        return { background: 'var(--color-progress-bg)', color: 'var(--color-progress)', border: '1px solid rgba(210,153,34,0.18)' };
      case 'closed':
        return { background: 'var(--color-closed-bg)', color: 'var(--color-closed)', border: '1px solid rgba(110,118,129,0.18)' };
      default:
        return { background: 'var(--color-closed-bg)', color: 'var(--color-closed)', border: '1px solid rgba(110,118,129,0.18)' };
    }
  };

  return (
    <div className="page-body fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Header Section */}
      <div style={{ marginBottom: '28px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.02em' }}>
          <Clock size={22} color="var(--color-teal)" /> Show Ticket States
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '6px', margin: 0, lineHeight: 1.5 }}>
          Monitor the live, step-by-step progress of your support requests. Click on any ticket below to see its exact resolution state timeline.
        </p>
      </div>

      {loading && tickets.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 12px', border: '2px solid var(--color-teal-muted)', borderTopColor: 'var(--color-teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          Loading your tickets...
        </div>
      ) : tickets.length === 0 ? (
        <div style={{ padding: '64px 16px', textAlign: 'center', background: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <Ticket size={44} color="var(--color-text-dim)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ color: 'var(--color-text)', fontSize: '15px', fontWeight: 600, margin: '0 0 6px' }}>
            No tickets raised yet
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', margin: 0 }}>
            You haven't created any support requests yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {tickets.map((t) => {
            const isExpanded = expandedTicketId === t._id;
            const badgeStyle = getStatusBadgeStyle(t);

            return (
              <div
                key={t._id}
                style={{
                  background: 'var(--color-card)',
                  border: isExpanded ? '1px solid var(--color-teal)' : '1px solid var(--color-border)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: isExpanded ? '0 4px 20px rgba(0,0,0,0.4)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Clickable Card Header */}
                <div
                  onClick={() => toggleExpand(t._id)}
                  style={{
                    padding: '18px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.parentNode.style.borderColor = 'var(--color-teal)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.parentNode.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: isExpanded ? 'var(--color-teal-muted)' : 'rgba(255,255,255,0.02)',
                      border: isExpanded ? '1px solid var(--color-teal-dark)' : '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s'
                    }}>
                      <Ticket size={16} color={isExpanded ? 'var(--color-teal)' : 'var(--color-text-muted)'} />
                    </div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: isExpanded ? 'var(--color-text)' : 'var(--color-text)',
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'color 0.2s'
                      }}>
                        {t.title}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        <span style={{ textTransform: 'capitalize' }}>Category: {t.category}</span>
                        <span>·</span>
                        <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge and Toggle Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '16px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        letterSpacing: '0.06em',
                        ...badgeStyle
                      }}
                    >
                      {t.approvalStatus === 'rejected' ? 'Declined' : (t.status === 'in-progress' ? 'In Progress' : t.status)}
                    </span>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isExpanded ? 'var(--color-teal)' : 'var(--color-text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        transition: 'color 0.2s'
                      }}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Inline Custom Stepper */}
                {isExpanded && (
                  <div style={{ 
                    padding: '0 24px 24px 24px', 
                    borderTop: '1px solid var(--color-border)', 
                    background: 'rgba(0, 0, 0, 0.15)' 
                  }}>
                    <SimplifiedTicketStepper ticket={t} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '32px', gap: '16px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: page === 1 ? 'var(--color-text-dim)' : 'var(--color-text)',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { if (page !== 1) e.currentTarget.style.borderColor = 'var(--color-teal)'; }}
            onMouseLeave={(e) => { if (page !== 1) e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            Previous
          </button>
          
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' }}>
            Page {page} of {pages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: page === pages ? 'var(--color-text-dim)' : 'var(--color-text)',
              cursor: page === pages ? 'not-allowed' : 'pointer',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { if (page !== pages) e.currentTarget.style.borderColor = 'var(--color-teal)'; }}
            onMouseLeave={(e) => { if (page !== pages) e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default UserTicketStates;
