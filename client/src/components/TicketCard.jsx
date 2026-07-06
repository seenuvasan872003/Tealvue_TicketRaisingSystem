// ============================================================
//  client/src/components/TicketCard.jsx  —  Ticket List Item
// ============================================================
//  LUCIDE ICONS USED:  Hash, Calendar, User
//  USAGE:  <TicketCard ticket={ticketObject} />
// ============================================================

import { Hash, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge, { PriorityBadge } from './StatusBadge';

const TicketCard = ({ ticket }) => {
  const navigate = useNavigate();

  // [UTIL] Format ISO date to readable string
  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

  return (
    <div
      className="card card-hover px-5 py-4 cursor-pointer"
      // [ACTION] Navigate to ticket detail page on click
      onClick={() => navigate(`/tickets/${ticket._id}`)}
    >
      {/* ── Badges row ─────────────────────── */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {/* [COMPONENT] Status chip — open / in-progress / closed */}
        <StatusBadge status={ticket.status} />

        {/* [COMPONENT] Priority chip — high / medium / low */}
        <PriorityBadge priority={ticket.priority} />

        {/* [UI] Category chip */}
        <span
          className="badge bg-[rgba(139,148,158,0.1)] text-[var(--color-text-muted)] border border-[var(--color-border)] capitalize"
        >
          {ticket.category}
        </span>
      </div>

      {/* ── Title ──────────────────────────── */}
      <h3
        className="text-sm font-semibold text-[var(--color-text)] mb-1 overflow-hidden whitespace-nowrap text-ellipsis"
      >
        {ticket.title}
      </h3>

      {/* ── Description preview ────────────── */}
      <p
        className="text-xs text-[var(--color-text-muted)] overflow-hidden line-clamp-2"
      >
        {ticket.description}
      </p>

      {/* ── Meta footer ────────────────────── */}
      <div
        className="flex justify-between items-center mt-3"
      >
        <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-dim)]">
          {/* [ICON] Hash for ticket ID */}
          <Hash size={11} />
          {ticket._id.slice(-6).toUpperCase()}

          <span className="mx-1">·</span>

          {/* [ICON] Calendar for created date */}
          <Calendar size={11} />
          {formatDate(ticket.createdAt)}
        </div>

        {ticket.user_id?.name && (
          <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
            {/* [ICON] User for ticket owner */}
            <User size={11} />
            {ticket.user_id.name}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketCard;
