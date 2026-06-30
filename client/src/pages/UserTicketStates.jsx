// ============================================================
//  client/src/pages/UserTicketStates.jsx
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { getTickets } from '../services/ticketApi';
import { 
  Clock, Ticket, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import TicketTimeline from '../components/TicketTimeline';
import logger from '../utils/logger';

const UserTicketStates = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const LIMIT = 10;

  const load = useCallback(async () => {
    setLoading(true);
    logger.info('UserTicketStates', 'load', `Loading user tickets with timelines — page: ${page}`, { api: '/api/tickets', method: 'GET', action: 'User Ticket States Load Start' });
    try {
      const { data } = await getTickets({ page, limit: LIMIT });
      setTickets(data.tickets || []);
      setPages(data.pages || 1);
      logger.info('UserTicketStates', 'load', `User tickets loaded — ${(data.tickets || []).length} tickets`, { api: '/api/tickets', method: 'GET', status: 200, action: 'User Ticket States Load Success' });
    } catch (e) {
      logger.error('UserTicketStates', 'load', 'Failed to load user tickets with timelines', e, { api: '/api/tickets', method: 'GET', action: 'User Ticket States Load Failure' });
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
                    <TicketTimeline ticketId={t._id} isUserView={true} />
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
