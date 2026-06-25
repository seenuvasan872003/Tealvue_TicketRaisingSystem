/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTickets, closeTicket, getMyTeam } from '../services/ticketApi';
import { toast } from 'react-toastify';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import { CheckCircle, Clock, Calendar, ClipboardList, Send } from 'lucide-react';

const TeamUserTickets = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isFinishedPage = location.pathname.includes('finished-tickets');

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
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
    try {
      setLoading(true);

      // Load team if not loaded yet
      let currentTeam = team;
      if (!currentTeam) {
        try {
          const teamRes = await getMyTeam();
          currentTeam = teamRes.data;
          setTeam(currentTeam);
        } catch (teamErr) {
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
    } catch (err) {
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
    if (!window.confirm('Are you sure you want to mark this ticket as Closed and notify the owner?')) return;
    try {
      await closeTicket(ticketId);
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {isFinishedPage ? (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', maxWidth: 300 }}>
            <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Total Finished Tickets</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-teal)' }}>{totalCount} tickets</div>
            </div>
          </div>
        ) : (
          <>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
              <Clock size={20} style={{ color: 'var(--color-yellow)' }} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Workload in Current Tab</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{totalAssigned} tickets</div>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
              <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Active In-Progress</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-teal)' }}>{inProgressCount} tickets</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Tabs */}
      {!isFinishedPage && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
          <button
            className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('active')}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <ClipboardList size={16} /> Active Assigned Tickets ({activeTickets.length})
          </button>
          <button
            className={`btn ${activeTab === 'transferred' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('transferred')}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Send size={16} /> Transferred Tickets ({transferredTickets.length})
          </button>
        </div>
      )}

      {/* Tabs Filter - only show for active tickets */}
      {!isFinishedPage && activeTab === 'active' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button
            className={`btn ${statusFilter === '' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setStatusFilter(''); setPage(1); }}
          >
            All Assigned
          </button>
          <button
            className={`btn ${statusFilter === 'in-progress' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setStatusFilter('in-progress'); setPage(1); }}
          >
            Active In-Progress
          </button>
          <button
            className={`btn ${statusFilter === 'closed' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setStatusFilter('closed'); setPage(1); }}
          >
            Resolved / Closed
          </button>
        </div>
      )}

      {/* Tickets List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Ticket Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 24 }}><div className="spinner" /></td>
                </tr>
              ) : displayedTickets.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>
                    {activeTab === 'active' ? 'No tickets found matching this status filter.' : 'No transferred tickets recorded.'}
                  </td>
                </tr>
              ) : (
                 displayedTickets.map((t) => (
                  <tr 
                    key={t._id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/tickets/${t._id}`)}
                    className="table-row-hover"
                  >
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-teal)' }}>
                      {t._id.slice(-6).toUpperCase()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        Owner: {t.user_id?.name || 'User'}
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{t.category}</td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <Calendar size={13} style={{ color: 'var(--color-text-muted)' }} />
                        <span>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Not set'}</span>
                      </div>
                    </td>
                    <td>
                      {activeTab === 'transferred' ? (
                        t.allocationStatus === 'transferred_to_admin' ? (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            Transferred to Admin
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                            Reallocated to {t.teamId?.name || 'Other Team'}
                          </span>
                        )
                      ) : (
                        <StatusBadge status={t.status} />
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {activeTab === 'transferred' ? (
                          <>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Read-Only</span>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '6px 12px', fontSize: 11 }}
                              onClick={() => navigate(`/tickets/${t._id}`)}
                            >
                              View Details
                            </button>
                          </>
                        ) : t.status === 'in-progress' ? (
                          <>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                              onClick={() => handleCloseTicket(t._id)}
                            >
                              <CheckCircle size={12} /> Resolve & Close
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '6px 12px', fontSize: 11 }}
                              onClick={() => navigate(`/tickets/${t._id}`)}
                            >
                              View Details
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Resolved ✓</span>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '6px 12px', fontSize: 11 }}
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

export default TeamUserTickets;
