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
          className="select w-[140px]"
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
          className="select w-[140px]"
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
        <div className="flex justify-center p-[60px]">
          <div className="spinner w-7 h-7" />
        </div>
      ) : tickets.length === 0 ? (
        // [UI] Empty state
        <div className="empty-state">
          <Ticket size={44} strokeWidth={1.5} />
          <h3>No tickets found</h3>
          <p>Try adjusting your filters or create a new ticket.</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/tickets/create')}>
            <Plus size={14} />
            Create Ticket
          </button>
        </div>
      ) : (
        <div className="bg-[var(--color-card)] border border-solid border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-[13px] min-w-[700px]">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.03)] border-b border-solid border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em]">#ID</th>
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em]">Title</th>
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em]">Category</th>
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em]">Status</th>
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em]">Priority</th>
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em]">Created Date</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t._id}
                    onClick={() => navigate(`/tickets/${t._id}`)}
                    className="border-b border-solid border-[var(--color-border-soft)] cursor-pointer transition-colors duration-[120ms] hover:bg-[rgba(255,255,255,0.03)]"
                  >
                    <td className="px-4 py-[13px] text-[var(--color-text-muted)] font-mono text-[11px]">
                      #{t._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-[13px] max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap font-medium text-[var(--color-text)]">
                      {t.title}
                    </td>
                    <td className="px-4 py-[13px] capitalize text-[12px] text-[var(--color-text-muted)]">
                      {t.category || 'General'}
                    </td>
                    <td className="px-4 py-[13px]">
                      <StatusBadge status={t.approvalStatus === 'suspended' ? 'suspended' : t.approvalStatus === 'rejected' ? 'rejected' : t.status} />
                    </td>
                    <td className="px-4 py-[13px]">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="px-4 py-[13px] text-[12px] text-[var(--color-text-muted)] whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
