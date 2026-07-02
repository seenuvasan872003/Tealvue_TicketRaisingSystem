// ============================================================
//  client/src/pages/MyTickets.jsx  —  User Ticket List
// ============================================================
//  LUCIDE ICONS USED:  Search, Plus, Filter, X, Ticket
//  API CALLS:
//    GET /api/tickets?page=&limit=&status=&priority=&search=
//    → returns { tickets, total, page, pages }
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Ticket } from 'lucide-react';
import { getTickets } from '../services/ticketApi';
import logger from '../utils/logger';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';

const MyTickets = () => {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });

  // [CONFIG] Tickets per page
  const LIMIT = 8;

  // [API] GET /api/tickets — load page with filters
  const load = useCallback(async () => {
    setLoading(true);
    logger.info('MyTickets', 'load', `Fetching tickets — page: ${page}`, { api: '/api/tickets', method: 'GET', action: 'Tickets Load Start' });
    try {
      const params = { page, limit: LIMIT };
      if (filters.status)   params.status   = filters.status;
      if (filters.priority) params.priority  = filters.priority;
      if (filters.search)   params.search    = filters.search;

      const { data } = await getTickets(params);
      setTickets(data.tickets);
      setTotal(data.total);
      setPages(data.pages);
      logger.info('MyTickets', 'load', `Tickets loaded — ${data.tickets.length} of ${data.total} total`, { api: '/api/tickets', method: 'GET', status: 200, action: 'Tickets Load Success' });
    } catch (e) {
      logger.error('MyTickets', 'load', 'Failed to load tickets', e, { api: '/api/tickets', method: 'GET', action: 'Tickets Load Failure' });
      console.error('[MyTickets] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  // [UTIL] Update a filter key and reset to page 1
  const handleFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const hasFilters = filters.status || filters.priority || filters.search;

  return (
    <div className="page-body fade-in">
      {/* ── Page Header ─────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tickets</h1>
          <p className="page-subtitle">
            {total} ticket{total !== 1 ? 's' : ''} found
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tickets/create')}>
          <Plus size={15} />
          New Ticket
        </button>
      </div>

      {/* ── Filter Bar ──────────────────────────── */}
      <div className="filter-bar">
        {/* Search input */}
        <div className="search-input-wrap">
          {/* [ICON] Search icon inside input */}
          <Search size={14} />
          <input
            id="mt-search"
            className="input"
            type="text"
            placeholder="Search tickets…"
            value={filters.search}
            onChange={(e) => handleFilter('search', e.target.value)}
          />
        </div>

        {/* Status filter */}
        <select
          id="mt-status"
          className="select"
          style={{ width: 140 }}
          value={filters.status}
          onChange={(e) => handleFilter('status', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>

        {/* Priority filter */}
        <select
          id="mt-priority"
          className="select"
          style={{ width: 140 }}
          value={filters.priority}
          onChange={(e) => handleFilter('priority', e.target.value)}
        >
          <option value="">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Clear filters button */}
        {hasFilters && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setFilters({ status: '', priority: '', search: '' }); setPage(1); }}
          >
            {/* [ICON] X to clear filters */}
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* ── Ticket List ─────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : tickets.length === 0 ? (
        // [UI] Empty state
        <div className="empty-state">
          <Ticket size={44} strokeWidth={1.5} />
          <h3>No tickets found</h3>
          <p>Try adjusting your filters or create a new ticket.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/tickets/create')}>
            <Plus size={14} />
            Create Ticket
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>#ID</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t._id}
                  onClick={() => navigate(`/tickets/${t._id}`)}
                  style={{
                    borderBottom: '1px solid var(--color-border-soft)',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '13px 16px', color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: 11 }}>
                    #{t._id.slice(-6).toUpperCase()}
                  </td>
                  <td style={{ padding: '13px 16px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--color-text)' }}>
                    {t.title}
                  </td>
                  <td style={{ padding: '13px 16px', textTransform: 'capitalize', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {t.category || 'General'}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <StatusBadge status={t.approvalStatus === 'suspended' ? 'suspended' : t.approvalStatus === 'rejected' ? 'rejected' : t.status} />
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ──────────────────────────── */}
      {pages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`page-btn${p === page ? ' active' : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button className="page-btn" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>›</button>
        </div>
      )}
    </div>
  );
};

export default MyTickets;
