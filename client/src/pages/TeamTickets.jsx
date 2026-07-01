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
      <div style={{ padding: 60, textAlign: 'center' }}>
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
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search tickets by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
          <div style={{ display: 'flex', gap: 12 }}>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="form-control"
              style={{ width: 160 }}
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
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button
          className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('active')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <ClipboardList size={16} /> Active Tickets ({activeTickets.length})
        </button>
        <button
          className={`btn ${activeTab === 'transferred' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('transferred')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Send size={16} /> Transferred Tickets ({transferredTickets.length})
        </button>
      </div>

      {/* Tickets Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Title</th>
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
                  <td colSpan="8" style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>
                    {activeTab === 'active' ? 'No active tickets currently allocated to your team.' : 'No transferred tickets recorded.'}
                  </td>
                </tr>
              ) : (
                 displayedTickets.map((ticket) => (
                  <tr 
                    key={ticket._id} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/tickets/${ticket._id}`)}
                    className="table-row-hover"
                  >
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {ticket._id.slice(-6).toUpperCase()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{ticket.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        Raised by: {ticket.user_id?.name || 'Unknown'}
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{ticket.category}</td>
                    <td><PriorityBadge priority={ticket.priority} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <Calendar size={13} style={{ color: 'var(--color-text-muted)' }} />
                        <span>{ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : 'Not Set'}</span>
                      </div>
                    </td>
                    <td>
                      {ticket.approvalStatus === 'suspended' ? (
                        <span className="badge" style={{ background: 'rgba(251, 146, 60, 0.1)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.2)', fontSize: 11 }}>
                          Under Review
                        </span>
                      ) : ticket.approvalStatus === 'rejected' ? (
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: 11 }}>
                          Declined
                        </span>
                      ) : activeTab === 'transferred' ? (
                        ticket.allocationStatus === 'transferred_to_admin' ? (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            Transferred to Admin
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                            Reallocated to {ticket.teamId?.name || 'Other Team'}
                          </span>
                        )
                      ) : (
                        <StatusBadge status={ticket.status} />
                      )}
                    </td>
                    <td>
                      {ticket.assignedToUser ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={13} style={{ color: 'var(--color-teal)' }} />
                          <span style={{ fontWeight: 500 }}>{ticket.assignedToUser.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Unassigned</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {activeTab === 'transferred' || ticket.approvalStatus === 'suspended' || ticket.approvalStatus === 'rejected' ? (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Read-Only</span>
                      ) : (
                        <select
                          onChange={(e) => handleAssignMember(ticket._id, e.target.value)}
                          value={ticket.assignedToUser?._id || ''}
                          className="form-control"
                          style={{ padding: '4px 8px', fontSize: 12, height: 'auto', width: 160 }}
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="btn btn-ghost"
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: 'var(--color-text-muted)' }}>
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
