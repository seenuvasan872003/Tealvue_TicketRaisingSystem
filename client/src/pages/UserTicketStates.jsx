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
    <div className="page-body fade-in max-w-[900px] mx-auto py-6 px-4">
      
      {/* Header Section */}
      <div className="mb-7 border-b border-[var(--color-border)] pb-4">
        <h1 className="text-[22px] font-bold text-[var(--color-text)] m-0 flex items-center gap-2.5 tracking-[-0.02em]">
          <Clock size={22} color="var(--color-teal)" /> Show Ticket States
        </h1>
        <p className="text-[13px] text-[var(--color-text-muted)] mt-1.5 mb-0 leading-relaxed">
          Monitor the live, step-by-step progress of your support requests. Click on any ticket below to see its exact resolution state timeline.
        </p>
      </div>

      {loading && tickets.length === 0 ? (
        <div className="py-20 text-center text-[var(--color-text-muted)] text-sm">
          <div className="spinner w-6 h-6 mx-auto mb-3 border-2 border-[var(--color-teal-muted)] border-t-[var(--color-teal)] rounded-full animate-spin" />
          Loading your tickets...
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-16 px-4 text-center bg-[var(--color-card)] rounded-xl border border-[var(--color-border)]">
          <Ticket size={44} color="var(--color-text-dim)" className="mx-auto mb-4" />
          <h3 className="text-[var(--color-text)] text-[15px] font-semibold m-0 mb-1.5">
            No tickets raised yet
          </h3>
          <p className="text-[var(--color-text-muted)] text-[13px] m-0">
            You haven't created any support requests yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {tickets.map((t) => {
            const isExpanded = expandedTicketId === t._id;
            const badgeStyle = getStatusBadgeStyle(t);

            return (
              <div
                key={t._id}
                className={`bg-[var(--color-card)] rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border border-[var(--color-teal)] shadow-[0_4px_20px_rgba(0,0,0,0.4)]' : 'border border-[var(--color-border)] shadow-none'}`}
              >
                {/* Clickable Card Header */}
                <div
                  onClick={() => toggleExpand(t._id)}
                  className={`py-[18px] px-6 flex justify-between items-center cursor-pointer group ${isExpanded ? 'bg-[rgba(255,255,255,0.015)]' : 'bg-transparent hover:bg-[rgba(255,255,255,0.01)]'}`}
                >
                  <div className="flex gap-4 items-center flex-1 overflow-hidden">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${isExpanded ? 'bg-[var(--color-teal-muted)] border border-[var(--color-teal-dark)]' : 'bg-[rgba(255,255,255,0.02)] border border-[var(--color-border)]'}`}>
                      <Ticket size={16} color={isExpanded ? 'var(--color-teal)' : 'var(--color-text-muted)'} />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-[15px] font-semibold text-[var(--color-text)] mb-1 whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-200">
                        {t.title}
                      </div>
                      <div className="flex gap-3 items-center text-[11px] text-[var(--color-text-muted)]">
                        <span className="capitalize">Category: {t.category}</span>
                        <span>·</span>
                        <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge and Toggle Arrow */}
                  <div className="flex items-center gap-4 ml-4">
                    <span
                      className="text-[10px] font-bold uppercase py-1 px-[9px] rounded-md tracking-[0.06em]"
                      style={badgeStyle}
                    >
                      {t.approvalStatus === 'rejected' ? 'Declined' : (t.status === 'in-progress' ? 'In Progress' : t.status)}
                    </span>
                    <button
                      className={`bg-transparent border-none cursor-pointer flex items-center justify-center p-0 transition-colors duration-200 ${isExpanded ? 'text-[var(--color-teal)]' : 'text-[var(--color-text-muted)]'}`}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Inline Custom Stepper */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-0 border-t border-[var(--color-border)] bg-[rgba(0,0,0,0.15)]">
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
        <div className="flex justify-center items-center mt-8 gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`border px-[18px] py-2 rounded-lg text-[13px] font-medium outline-none transition-all duration-200 ${page === 1 ? 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-dim)] cursor-not-allowed' : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text)] cursor-pointer hover:border-[var(--color-teal)]'}`}
          >
            Previous
          </button>
          
          <span className="text-[13px] text-[var(--color-text-muted)] font-medium">
            Page {page} of {pages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className={`border px-[18px] py-2 rounded-lg text-[13px] font-medium outline-none transition-all duration-200 ${page === pages ? 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-dim)] cursor-not-allowed' : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text)] cursor-pointer hover:border-[var(--color-teal)]'}`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default UserTicketStates;
