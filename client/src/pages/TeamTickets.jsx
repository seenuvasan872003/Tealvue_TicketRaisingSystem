import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTickets, getMyTeam, getTeamMembers, assignTicketMember } from '../services/ticketApi';
import { toast } from 'react-toastify';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import { User, ClipboardList, Send, Calendar } from 'lucide-react';
import logger from '../utils/logger';

const TeamTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [members, setMembers] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'transferred'

  const loadTeamData = async () => {
    logger.info('TeamTickets', 'loadTeamData', 'Loading team data and tickets', { action: 'Team Tickets Load Start' });
    try {
      setLoading(true);
      // 1. Get own team details
      const teamRes = await getMyTeam();
      setTeam(teamRes.data);

      // 2. Get members for this team
      const membersRes = await getTeamMembers(teamRes.data._id);
      setMembers(membersRes.data || []);

      // 3. Get tickets
      await loadTickets(teamRes.data._id, page, search, statusFilter);
      logger.info('TeamTickets', 'loadTeamData', `Team data loaded — team: ${teamRes.data.name}`, {
        api: '/api/teams/mine', method: 'GET', action: 'Team Tickets Load Success',
      });
    } catch (err) {
      logger.error('TeamTickets', 'loadTeamData', 'Failed to load team tickets or members', err, {
        api: '/api/teams/mine', method: 'GET', action: 'Team Tickets Load Failure',
      });
      console.error(err);
      toast.error('Failed to load team tickets or members');
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async (teamId, pageNum, searchTerm, status) => {
    logger.info('TeamTickets', 'loadTickets', `Fetching team tickets — page: ${pageNum}`, { api: '/api/tickets', method: 'GET', action: 'Team Tickets Fetch Start' });
    try {
      const params = {
        page: pageNum,
        limit: 10,
        search: searchTerm,
      };
      if (status) params.status = status;
      
      const { data } = await getTickets(params);
      setTickets(data.tickets || []);
      setTotalPages(data.pages || 1);
      logger.info('TeamTickets', 'loadTickets', `Tickets fetched — ${(data.tickets || []).length} tickets on page ${pageNum}`, {
        api: '/api/tickets', method: 'GET', status: 200, action: 'Team Tickets Fetch Success',
      });
    } catch (err) {
      logger.error('TeamTickets', 'loadTickets', 'Failed to load team tickets', err, { api: '/api/tickets', method: 'GET', action: 'Team Tickets Fetch Failure' });
      console.error(err);
      toast.error('Failed to load tickets');
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    if (team) {
      loadTickets(team._id, 1, search, statusFilter);
    }
  };

  const handleAssignMember = async (ticketId, memberId) => {
    if (!memberId) return;
    try {
      await assignTicketMember(ticketId, memberId);
      toast.success('Ticket allocated to team agent successfully');
      // Reload tickets
      if (team) {
        loadTickets(team._id, page, search, statusFilter);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to allocate ticket');
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

  if (loading && !team) {
    return (
      <div className="p-[60px] text-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Tickets</h1>
          <p className="page-subtitle">Manage and allocate tickets assigned to the <strong>{team?.name || 'Support'}</strong> team.</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card mb-5">
        <div className="flex gap-4 flex-wrap items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-[260px]">
            <input
              type="text"
              className="form-control flex-1"
              placeholder="Search tickets by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="form-control w-[160px]"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-5">
        <button
          className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-ghost'} flex items-center gap-2`}
          onClick={() => setActiveTab('active')}
        >
          <ClipboardList size={16} /> Active Tickets ({activeTickets.length})
        </button>
        <button
          className={`btn ${activeTab === 'transferred' ? 'btn-primary' : 'btn-ghost'} flex items-center gap-2`}
          onClick={() => setActiveTab('transferred')}
        >
          <Send size={16} /> Transferred Tickets ({transferredTickets.length})
        </button>
      </div>

      {/* Tickets Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th className="w-[220px] min-w-[220px]">Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Assigned Agent</th>
                <th>Allocate Agent</th>
              </tr>
            </thead>
            <tbody>
              {displayedTickets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center p-6 text-[var(--color-text-muted)]">
                    {activeTab === 'active' ? 'No active tickets currently allocated to your team.' : 'No transferred tickets recorded.'}
                  </td>
                </tr>
              ) : (
                 displayedTickets.map((ticket) => (
                  <tr 
                    key={ticket._id} 
                    onClick={() => navigate(`/tickets/${ticket._id}`)}
                    className="table-row-hover cursor-pointer"
                  >
                    <td className="font-mono text-xs text-[var(--color-text-muted)]">
                      {ticket._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="min-w-[220px]">
                      <div className="font-semibold text-white whitespace-normal break-words">{ticket.title}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        Raised by: {ticket.user_id?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="capitalize">{ticket.category}</td>
                    <td><PriorityBadge priority={ticket.priority} /></td>
                    <td>
                      <div className="flex items-center gap-[6px] text-xs">
                        <Calendar size={13} className="text-[var(--color-text-muted)]" />
                        <span>{ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : 'Not Set'}</span>
                      </div>
                    </td>
                    <td>
                      {ticket.approvalStatus === 'suspended' ? (
                        <span className="badge bg-[rgba(251,146,60,0.1)] text-[#fb923c] border border-[rgba(251,146,60,0.2)] text-[11px]">
                          Under Review
                        </span>
                      ) : ticket.approvalStatus === 'rejected' ? (
                        <span className="badge bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)] text-[11px]">
                          Declined
                        </span>
                      ) : activeTab === 'transferred' ? (
                        ticket.allocationStatus === 'transferred_to_admin' ? (
                          <span className="badge bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]">
                            Transferred to Admin
                          </span>
                        ) : (
                          <span className="badge bg-[rgba(139,92,246,0.1)] text-[#a78bfa] border border-[rgba(139,92,246,0.2)]">
                            Reallocated to {ticket.teamId?.name || 'Other Team'}
                          </span>
                        )
                      ) : (
                        <StatusBadge status={ticket.status} />
                      )}
                    </td>
                    <td>
                      {ticket.assignedToUser ? (
                        <div className="flex items-center gap-[6px]">
                          <User size={13} className="text-[var(--color-teal)]" />
                          <span className="font-medium">{ticket.assignedToUser.name}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--color-text-muted)] text-xs">Unassigned</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {activeTab === 'transferred' || ticket.approvalStatus === 'suspended' || ticket.approvalStatus === 'rejected' ? (
                        <span className="text-[var(--color-text-muted)] text-xs">Read-Only</span>
                      ) : (
                        <select
                          onChange={(e) => handleAssignMember(ticket._id, e.target.value)}
                          value={ticket.assignedToUser?._id || ''}
                          className="form-control px-2 py-1 text-xs h-auto w-[160px]"
                          disabled={ticket.status === 'closed'}
                        >
                          <option value="">-- Choose Agent --</option>
                          {members.map((m) => (
                            <option key={m._id} value={m._id}>{m.name} ({m.closedCount} closed)</option>
                          ))}
                        </select>
                      )}
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

export default TeamTickets;
