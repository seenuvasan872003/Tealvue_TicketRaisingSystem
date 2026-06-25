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
      className="card card-hover"
      style={{ padding: '16px 20px', cursor: 'pointer' }}
      // [ACTION] Navigate to ticket detail page on click
      onClick={() => navigate(`/tickets/${ticket._id}`)}
    >
      {/* ── Badges row ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {/* [COMPONENT] Status chip — open / in-progress / closed */}
        <StatusBadge status={ticket.status} />

        {/* [COMPONENT] Priority chip — high / medium / low */}
        <PriorityBadge priority={ticket.priority} />

        {/* [UI] Category chip */}
        <span
          className="badge"
          style={{
            background: 'rgba(139,148,158,0.1)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
            textTransform: 'capitalize',
          }}
        >
          {ticket.category}
        </span>
      </div>

      {/* ── Title ──────────────────────────── */}
      <h3
        style={{
          fontSize: 14, fontWeight: 600, color: 'var(--color-text)',
          marginBottom: 4, overflow: 'hidden',
          whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}
      >
        {ticket.title}
      </h3>

      {/* ── Description preview ────────────── */}
      <p
        style={{
          fontSize: 12, color: 'var(--color-text-muted)',
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}
      >
        {ticket.description}
      </p>

      {/* ── Meta footer ────────────────────── */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginTop: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-dim)' }}>
          {/* [ICON] Hash for ticket ID */}
          <Hash size={11} />
          {ticket._id.slice(-6).toUpperCase()}

          <span style={{ margin: '0 4px' }}>·</span>

          {/* [ICON] Calendar for created date */}
          <Calendar size={11} />
          {formatDate(ticket.createdAt)}
        </div>

        {ticket.user_id?.name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
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
