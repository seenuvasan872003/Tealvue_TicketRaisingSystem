/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTickets, closeTicket, getMyTeam } from '../services/ticketApi';
import { toast } from 'react-toastify';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import { CheckCircle, Clock, Calendar, ClipboardList, Send } from 'lucide-react';
import logger from '../utils/logger';
import { useConfirm } from '../context/ConfirmContext';

import { getCache, setCache } from '../utils/cache';

const TeamUserTickets = () => {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isFinishedPage = location.pathname.includes('finished-tickets');
  const cacheKey = isFinishedPage ? 'finished_tickets' : 'assigned_tickets';

  const [tickets, setTickets] = useState(() => {
    const cached = getCache(cacheKey);
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = getCache(cacheKey);
    return !Array.isArray(cached);
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState(isFinishedPage ? 'closed' : '');
  const [team, setTeam] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'transferred'

  // Synchronize filter when navigating between sidebar links
  useEffect(() => {
    if (isFinishedPage) {
      setStatusFilter('closed');
      setActiveTab('active');
    } else {
      setStatusFilter('');
    }
    setPage(1);
  }, [location.pathname]);

  const loadAssignedTickets = async () => {
    logger.info('TeamUserTickets', 'loadAssignedTickets', `Loading assigned tickets — page: ${page}`, { api: '/api/tickets', method: 'GET', action: 'Assigned Tickets Load Start' });
    try {
      if (page !== 1 || statusFilter !== (isFinishedPage ? 'closed' : '')) {
        setLoading(true);
      }

      // Load team if not loaded yet
      let currentTeam = team;
      if (!currentTeam) {
        try {
          const teamRes = await getMyTeam();
          currentTeam = teamRes.data;
          setTeam(currentTeam);
        } catch (teamErr) {
          logger.error('TeamUserTickets', 'loadAssignedTickets', 'Failed to load team details for agent', teamErr, { api: '/api/teams/mine', method: 'GET', action: 'Team Load Failure' });
          console.error('Failed to load team details for agent', teamErr);
        }
      }

      const params = {
        page,
        limit: 10,
      };
      if (statusFilter) params.status = statusFilter;

      const { data } = await getTickets(params);
      setTickets(data.tickets || []);
      setTotalPages(data.pages || 1);
      setTotalCount(data.total || 0);

      // Cache page 1 results
      if (page === 1 && statusFilter === (isFinishedPage ? 'closed' : '')) {
        setCache(cacheKey, data.tickets || [], 3);
      }

      logger.info('TeamUserTickets', 'loadAssignedTickets', `Assigned tickets loaded — ${(data.tickets || []).length} tickets`, { api: '/api/tickets', method: 'GET', status: 200, action: 'Assigned Tickets Load Success' });
    } catch (err) {
      logger.error('TeamUserTickets', 'loadAssignedTickets', 'Failed to load assigned tickets', err, { api: '/api/tickets', method: 'GET', action: 'Assigned Tickets Load Failure' });
      console.error(err);
      toast.error('Failed to load assigned tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignedTickets();
  }, [page, statusFilter]);

  const handleCloseTicket = async (ticketId) => {
    const ok = await confirm('Are you sure you want to mark this ticket as Closed and notify the owner?', 'Close Ticket');
    if (!ok) return;
    try {
      await closeTicket(ticketId);
      
      // Invalidate relevant caches
      invalidateCache('assigned_tickets');
      invalidateCache('finished_tickets');
      invalidateCache('all_tickets');
      invalidateCache('dashboard_stats');
      
      toast.success('Ticket marked as resolved and closed!');
      loadAssignedTickets();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to close ticket');
    }
  };

  const activeTickets = tickets.filter(t => {
    const isTransferred = (t.reallocatedFromTeamId && (t.reallocatedFromTeamId === team?._id || t.reallocatedFromTeamId?._id === team?._id)) ||
                          t.allocationStatus === 'transferred_to_admin';
    return !isTransferred;
  });

  const transferredTickets = tickets.filter(t => {
    const isTransferred = (t.reallocatedFromTeamId && (t.reallocatedFromTeamId === team?._id || t.reallocatedFromTeamId?._id === team?._id)) ||
                          t.allocationStatus === 'transferred_to_admin';
    return isTransferred;
  });

  const displayedTickets = activeTab === 'active' ? activeTickets : transferredTickets;

  // Stats for the agent
  const totalAssigned = activeTickets.length;
  const inProgressCount = activeTickets.filter(t => t.status === 'in-progress').length;

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isFinishedPage ? 'My Finished Tickets' : 'My Assigned Tickets'}</h1>
          <p className="page-subtitle">
            {isFinishedPage 
              ? 'View all support requests resolved and completed by you.' 
              : 'Resolve support requests assigned to you by your Team Admin.'}
          </p>
        </div>
      </div>

      {/* Mini stats dashboard */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mb-6">
        {isFinishedPage ? (
          <div className="card flex items-center gap-3 py-4 px-5 max-w-[300px]">
            <CheckCircle size={20} className="text-[var(--color-success)]" />
            <div>
              <div className="text-[11px] text-[var(--color-text-muted)]">Total Finished Tickets</div>
              <div className="text-lg font-bold text-[var(--color-teal)]">{totalCount} tickets</div>
            </div>
          </div>
        ) : (
          <>
            <div className="card flex items-center gap-3 py-4 px-5">
              <Clock size={20} className="text-[var(--color-yellow)]" />
              <div>
                <div className="text-[11px] text-[var(--color-text-muted)]">Workload in Current Tab</div>
                <div className="text-lg font-bold text-white">{totalAssigned} tickets</div>
              </div>
            </div>
            <div className="card flex items-center gap-3 py-4 px-5">
              <CheckCircle size={20} className="text-[var(--color-success)]" />
              <div>
                <div className="text-[11px] text-[var(--color-text-muted)]">Active In-Progress</div>
                <div className="text-lg font-bold text-[var(--color-teal)]">{inProgressCount} tickets</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Tabs */}
      {!isFinishedPage && (
        <div className="flex gap-3 mb-4 border-b border-[var(--color-border)] pb-3 overflow-x-auto whitespace-nowrap w-full [scrollbar-width:none]">
          <button
            className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-ghost'} flex items-center gap-2 shrink-0`}
            onClick={() => setActiveTab('active')}
          >
            <ClipboardList size={16} /> Active Assigned Tickets ({activeTickets.length})
          </button>
          <button
            className={`btn ${activeTab === 'transferred' ? 'btn-primary' : 'btn-ghost'} flex items-center gap-2 shrink-0`}
            onClick={() => setActiveTab('transferred')}
          >
            <Send size={16} /> Transferred Tickets ({transferredTickets.length})
          </button>
        </div>
      )}

      {/* Tabs Filter - only show for active tickets */}
      {!isFinishedPage && activeTab === 'active' && (
        <div className="flex gap-3 mb-4 overflow-x-auto whitespace-nowrap w-full [scrollbar-width:none]">
          <button
            className={`btn ${statusFilter === '' ? 'btn-primary' : 'btn-ghost'} shrink-0`}
            onClick={() => { setStatusFilter(''); setPage(1); }}
          >
            All Assigned
          </button>
          <button
            className={`btn ${statusFilter === 'in-progress' ? 'btn-primary' : 'btn-ghost'} shrink-0`}
            onClick={() => { setStatusFilter('in-progress'); setPage(1); }}
          >
            Active In-Progress
          </button>
          <button
            className={`btn ${statusFilter === 'closed' ? 'btn-primary' : 'btn-ghost'} shrink-0`}
            onClick={() => { setStatusFilter('closed'); setPage(1); }}
          >
            Resolved / Closed
          </button>
        </div>
      )}

      {/* Tickets List */}
      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="w-full border-collapse text-[13px] min-w-[950px]">
            <thead>
              <tr>
                <th className="w-[80px]">ID</th>
                <th className="w-[220px] min-w-[220px]">Ticket Title</th>
                <th className="w-[100px]">Category</th>
                <th className="w-[100px]">Priority</th>
                <th className="w-[150px]">Due Date</th>
                <th className="w-[120px]">Status</th>
                <th className="w-[230px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><div className="skeleton-box w-[60px] h-4" /></td>
                    <td>
                      <div className="skeleton-box w-[200px] h-4 mb-1" />
                      <div className="skeleton-box w-[120px] h-3" />
                    </td>
                    <td><div className="skeleton-box w-[80px] h-4" /></td>
                    <td><div className="skeleton-box w-[60px] h-4" /></td>
                    <td><div className="skeleton-box w-[100px] h-4" /></td>
                    <td><div className="skeleton-box w-[80px] h-4" /></td>
                    <td>
                      <div className="flex gap-2">
                        <div className="skeleton-box w-[90px] h-6 rounded" />
                        <div className="skeleton-box w-[90px] h-6 rounded" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : displayedTickets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-6 text-[var(--color-text-muted)]">
                    {activeTab === 'active' ? 'No tickets found matching this status filter.' : 'No transferred tickets recorded.'}
                  </td>
                </tr>
              ) : (
                 displayedTickets.map((t) => (
                  <tr 
                    key={t._id}
                    onClick={() => navigate(`/tickets/${t._id}`)}
                    className="table-row-hover cursor-pointer"
                  >
                    <td className="font-mono text-xs text-[var(--color-teal)]">
                      {t._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="min-w-[220px]">
                      <div className="font-semibold text-white whitespace-normal break-words">
                        {t.title}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        Owner: {t.user_id?.name || 'User'}
                      </div>
                    </td>
                    <td className="capitalize">{t.category}</td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td>
                      <div className="flex items-center gap-[6px] text-xs">
                        <Calendar size={13} className="text-[var(--color-text-muted)]" />
                        <span>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Not set'}</span>
                      </div>
                    </td>
                    <td>
                      {t.approvalStatus === 'suspended' ? (
                        <span className="badge bg-[rgba(251,146,60,0.1)] text-[#fb923c] border border-[rgba(251,146,60,0.2)] text-[11px]">
                          Under Review
                        </span>
                      ) : t.approvalStatus === 'rejected' ? (
                        <span className="badge bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)] text-[11px]">
                          Declined
                        </span>
                      ) : activeTab === 'transferred' ? (
                        t.allocationStatus === 'transferred_to_admin' ? (
                          <span className="badge bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]">
                            Transferred to Admin
                          </span>
                        ) : (
                          <span className="badge bg-[rgba(139,92,246,0.1)] text-[#a78bfa] border border-[rgba(139,92,246,0.2)]">
                            Reallocated to {t.teamId?.name || 'Other Team'}
                          </span>
                        )
                      ) : (
                        <StatusBadge status={t.status} />
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 items-center">
                        {activeTab === 'transferred' || t.approvalStatus === 'suspended' || t.approvalStatus === 'rejected' ? (
                          <>
                            <span className="text-[var(--color-text-muted)] text-xs">Read-Only</span>
                            <button
                              className="btn btn-ghost py-1.5 px-3 text-[11px]"
                              onClick={() => navigate(`/tickets/${t._id}`)}
                            >
                              View Details
                            </button>
                          </>
                        ) : t.status === 'in-progress' ? (
                          <>
                            <button
                              className="btn btn-primary py-1.5 px-3 text-[11px] inline-flex items-center gap-[6px]"
                              onClick={() => handleCloseTicket(t._id)}
                            >
                              <CheckCircle size={12} /> Resolve & Close
                            </button>
                            <button
                              className="btn btn-ghost py-1.5 px-3 text-[11px]"
                              onClick={() => navigate(`/tickets/${t._id}`)}
                            >
                              View Details
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[var(--color-text-muted)] text-xs">Resolved ✓</span>
                            <button
                              className="btn btn-ghost py-1.5 px-3 text-[11px]"
                              onClick={() => navigate(`/tickets/${t._id}`)}
                            >
                              View Details
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="btn btn-ghost"
          >
            Previous
          </button>
          <span className="flex items-center px-3 text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="btn btn-ghost"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamUserTickets;
