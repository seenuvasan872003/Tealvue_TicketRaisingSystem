// ============================================================
//  client/src/pages/AllTickets.jsx  —  Admin/Super Admin Ticket Table
// ============================================================
//  Admin:       sees ALL tickets; can update only ASSIGNED tickets
//  Super Admin: sees ALL tickets; can update + assign all tickets
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Ticket, UserCheck, ShieldCheck } from 'lucide-react';
import { getTickets, updateTicket, getTeams, assignTicketTeam, deleteTicket, restoreTicket, getCategories } from '../services/ticketApi';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import API from '../services/authApi';
import logger from '../utils/logger';

const AllTickets = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tickets,  setTickets]  = useState([]);
  const [teams,    setTeams]    = useState([]);
  const [categories, setCategories] = useState(['General', 'Technical', 'Billing', 'HR', 'Other']);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [filters,  setFilters]  = useState({ status: '', priority: '', search: '', team: '', unassignedOnly: false, needsAttention: false, showDeclined: false });
  const [updating, setUpdating] = useState(null);
  const [activeAssignTicket, setActiveAssignTicket] = useState(null);

  const LIMIT = 12;

  const loadTeams = async () => {
    logger.info('AllTickets', 'loadTeams', 'Loading teams list', { api: '/api/teams', method: 'GET', action: 'Teams Load Start' });
    try {
      const { data } = await getTeams();
      setTeams(data.teams || data || []);
      logger.info('AllTickets', 'loadTeams', `Teams loaded — ${(data.teams || data || []).length} teams`, { api: '/api/teams', method: 'GET', status: 200, action: 'Teams Load Success' });
    } catch (e) {
      logger.error('AllTickets', 'loadTeams', 'Failed to load teams', e, { api: '/api/teams', method: 'GET', action: 'Teams Load Failure' });
      console.error('[AllTickets] load teams error:', e);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    logger.info('AllTickets', 'load', `Loading all tickets — page: ${page}`, { api: '/api/tickets', method: 'GET', action: 'All Tickets Load Start' });
    try {
      const params = { page, limit: LIMIT };
      if (filters.status)   params.status   = filters.status;
      if (filters.priority) params.priority  = filters.priority;
      if (filters.search)   params.search    = filters.search;
      if (filters.team)     params.teamId    = filters.team;
      if (filters.unassignedOnly) params.teamId = 'none';
      if (filters.needsAttention) params.needsAttention = 'true';
      if (filters.showDeclined) params.showDeclined = 'true';

      const { data } = await getTickets(params);
      
      let fetched = data.tickets || [];
      if (filters.unassignedOnly) {
        fetched = fetched.filter(t => !t.teamId);
      }

      setTickets(fetched);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      logger.info('AllTickets', 'load', `Tickets loaded — ${fetched.length} of ${data.total} total`, { api: '/api/tickets', method: 'GET', status: 200, action: 'All Tickets Load Success' });
    } catch (e) {
      logger.error('AllTickets', 'load', 'Failed to load all tickets', e, { api: '/api/tickets', method: 'GET', action: 'All Tickets Load Failure' });
      console.error('[AllTickets] load error:', e);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadTeams();
    const fetchCats = async () => {
      try {
        const { data } = await getCategories();
        if (data && data.length > 0) setCategories(data);
      } catch {}
    };
    fetchCats();
  }, []);

  const handleFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const handleStatusChange = async (ticketId, status, e) => {
    e.stopPropagation();
    setUpdating(ticketId);
    try {
      const { data } = await API.put(`/tickets/${ticketId}/status`, { status });
      const updatedTicket = data.ticket || data;
      setTickets((ts) => ts.map((t) => (t._id === ticketId ? { ...t, status: updatedTicket.status } : t)));
      toast.success(`Status updated to "${status}"`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  const handlePriorityChange = async (ticketId, priority, e) => {
    e.stopPropagation();
    setUpdating(ticketId);
    try {
      const { data } = await API.put(`/tickets/${ticketId}/priority`, { priority });
      const updatedTicket = data.ticket || data;
      setTickets((ts) => ts.map((t) => (t._id === ticketId ? { ...t, priority: updatedTicket.priority } : t)));
      toast.success(`Priority updated to "${priority}"`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Priority update failed');
    } finally {
      setUpdating(null);
    }
  };

  const handleTeamChange = async (ticketId, teamId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setUpdating(ticketId);
    try {
      const { data } = await assignTicketTeam(ticketId, teamId || null);
      setTickets((ts) => ts.map((t) => (t._id === ticketId ? { ...t, teamId: data.ticket?.teamId || data.teamId || null } : t)));
      toast.success(`Team reassigned successfully`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Team assignment failed');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const hasFilters = filters.status || filters.priority || filters.search || filters.team || filters.unassignedOnly;

  return (
    <div className="page-body fade-in">
      {/* ── Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">All Tickets</h1>
          <p className="page-subtitle">{total} ticket{total !== 1 ? 's' : ''} in the system</p>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex gap-4 border-b border-[var(--color-border)] mb-5">
        <button
          onClick={() => {
            setFilters(f => ({ ...f, needsAttention: false, showDeclined: false }));
            setPage(1);
          }}
          className={`px-4 py-2.5 bg-transparent border-none font-semibold cursor-pointer text-sm ${
            !filters.needsAttention && !filters.showDeclined
              ? 'border-b-2 border-[var(--color-teal)] text-[var(--color-teal)]'
              : 'border-b-2 border-transparent text-[#acacac]'
          }`}
        >
          All Tickets
        </button>
        <button
          onClick={() => {
            setFilters(f => ({ ...f, needsAttention: true, showDeclined: false }));
            setPage(1);
          }}
          className={`px-4 py-2.5 bg-transparent border-none font-semibold cursor-pointer text-sm flex items-center gap-1.5 ${
            filters.needsAttention
              ? 'border-b-2 border-[var(--color-teal)] text-[var(--color-teal)]'
              : 'border-b-2 border-transparent text-[#acacac]'
          }`}
        >
          <ShieldCheck size={16} /> Needs Attention
        </button>
        <button
          onClick={() => {
            setFilters(f => ({ ...f, needsAttention: false, showDeclined: true }));
            setPage(1);
          }}
          className={`px-4 py-2.5 bg-transparent border-none font-semibold cursor-pointer text-sm flex items-center gap-1.5 ${
            filters.showDeclined
              ? 'border-b-2 border-[var(--color-teal)] text-[var(--color-teal)]'
              : 'border-b-2 border-transparent text-[#acacac]'
          }`}
        >
          Declined Tickets
        </button>
      </div>

      {/* ── Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:flex-nowrap gap-[10px] sm:gap-[8px] items-stretch sm:items-center w-full mb-4 overflow-visible">
        <div className="search-input-wrap relative w-full sm:flex-1 sm:min-w-[160px] h-[42px] sm:h-[38px] flex items-center">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            className="input w-auto h-full pl-9 pr-3 text-xs bg-[#1a1a1a] border border-[#4b4b4b] rounded-lg"
            type="text"
            placeholder="Search by title or ID…"
            value={filters.search}
            onChange={(e) => handleFilter('search', e.target.value)}
          />
        </div>

        <select 
          className="select w-auto h-[42px] sm:h-[38px] text-xs bg-[#1a1a1a] border border-[#4b4b4b] rounded-lg cursor-pointer px-3" 
          value={filters.status} 
          onChange={(e) => handleFilter('status', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>

        <select 
          className="select w-auto  h-[42px] sm:h-[38px] text-xs bg-[#1a1a1a] border border-[#4b4b4b] rounded-lg cursor-pointer px-3" 
          value={filters.priority} 
          onChange={(e) => handleFilter('priority', e.target.value)}
        >
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select 
          className="select w-auto  h-[42px] sm:h-[38px] text-xs bg-[#1a1a1a] border border-[#4b4b4b] rounded-lg cursor-pointer px-3" 
          value={filters.team} 
          onChange={(e) => handleFilter('team', e.target.value)}
        >
          <option value="">All Teams</option>
          {teams.map(t => (
            <option key={t.teamId || t._id} value={t.teamId || t._id}>{t.name}</option>
          ))}
        </select>

        <label className="flex items-center gap-[6px] text-xs text-[#acacac] cursor-pointer  w-auto sm:whitespace-nowrap h-[42px] sm:h-[38px] pl-1 sm:pl-0 justify-start">
          <input 
            type="checkbox" 
            checked={filters.unassignedOnly} 
            onChange={(e) => handleFilter('unassignedOnly', e.target.checked)} 
            className="!w-auto h-3.5"
          />
          Show unassigned only
        </label>

        {hasFilters && (
          <button className="btn btn-ghost btn-sm h-[42px] sm:h-[38px] w-full sm:w-auto flex items-center justify-center gap-1" onClick={() => { setFilters({ status: '', priority: '', search: '', team: '', unassignedOnly: false }); setPage(1); }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Needs Attention Info Banner */}
      {filters.needsAttention && (
        <div className="bg-[rgba(211,167,60,0.04)] border border-dashed border-[rgba(211,167,60,0.3)] rounded-lg py-3 px-4 mb-4 text-[13px] text-[#d3a73c] leading-relaxed">
          <strong>What is "Needs Attention"?</strong> This view displays tickets that require immediate Admin action:
          <ul className="mt-1 ml-5 p-0 list-disc">
            <li><strong>Pending Allocation:</strong> Newly created tickets submitted without a category. Admins must set a category to trigger auto-allocation or assign a team manually.</li>
            <li><strong>Transferred to Admin:</strong> Tickets that were transferred back to Admins by support teams, requiring manual review or reallocation.</li>
          </ul>
        </div>
      )}

      {/* ── Table */}
      {loading ? (
        <div className="flex justify-center p-[60px]">
          <div className="spinner w-7 h-7" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="empty-state border border-[var(--color-border)] rounded-xl">
          <Ticket size={44} strokeWidth={1.5} />
          <h3>No tickets found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="table-wrap overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[800px]">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.03)] border-b border-[var(--color-border)]">
                  <th className="py-3 px-2.5 pl-4 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em] w-[70px]">#ID</th>
                  <th className="py-3 px-2.5 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em] w-[140px]">Title</th>
                  <th className="py-3 px-2.5 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em] w-[90px]">Category</th>
                  <th className="py-3 px-2.5 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em] w-[110px]">Priority</th>
                  <th className="py-3 px-2.5 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em] w-[110px]">Status</th>
                  <th className="py-3 px-2.5 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em] w-[90px]">User</th>
                  <th className="py-3 px-2.5 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em] w-[140px]">Team Assigned</th>
                  <th className="py-3 px-2.5 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em] w-[90px]">Created</th>
                  <th className="py-3 px-2.5 text-left text-[#acacac] font-semibold text-[11px] uppercase tracking-[0.06em] w-[180px]">Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const mappedCat = t.category ? (t.category.charAt(0).toUpperCase() + t.category.slice(1)) : 'General';
                  const filteredTeams = teams.filter(tm => tm.categories.includes(mappedCat) || tm.categories.includes(t.category));
                  const currentTeam = teams.find(tm => tm._id === (t.teamId?._id || t.teamId));
                  
                  return (
                    <tr
                      key={t._id}
                      onClick={() => navigate(`/tickets/${t._id}`)}
                      className="border-b border-[var(--color-border-soft)] cursor-pointer transition-colors duration-100 hover:bg-[rgba(255,255,255,0.03)]"
                    >
                      <td className="py-3 px-2.5 pl-4 text-[#555] font-mono text-[11px]">
                        #{t._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-2.5 max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap font-medium text-[#e4e4e4]">
                        {t.title}
                      </td>
                      <td className="py-3 px-2.5 capitalize text-xs text-[#acacac]">{t.category || 'General'}</td>
                      <td className="py-3 px-2.5" onClick={(e) => e.stopPropagation()}>
                        {t.approvalStatus === 'suspended' || t.approvalStatus === 'rejected' || t.status === 'closed' ? (
                          <span className="capitalize text-[#acacac] text-xs">{t.priority}</span>
                        ) : (
                          <select
                              className="select py-1 pl-2 pr-6 text-xs min-w-[80px] w-full outline-none"
                            value={t.priority}
                            disabled={updating === t._id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handlePriorityChange(t._id, e.target.value, e)}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        )}
                      </td>
                      <td className="px-2.5 py-3" onClick={(e) => e.stopPropagation()}>
                        {t.approvalStatus === 'suspended' ? (
                          <span className="badge bg-[rgba(251,146,60,0.1)] text-[#fb923c] border border-[rgba(251,146,60,0.2)] text-[11px] px-2 py-1">
                            Under Review
                          </span>
                        ) : t.approvalStatus === 'rejected' ? (
                          <span className="badge bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)] text-[11px] px-2 py-1">
                            Declined
                          </span>
                        ) : t.status === 'closed' ? (
                          <span className="capitalize text-[#acacac] text-xs">{t.status}</span>
                        ) : (
                          <select
                              className="select py-1 pr-6 pl-2 text-xs min-w-[90px] w-full outline-none"
                            value={t.status}
                            disabled={updating === t._id}
                            onChange={(e) => handleStatusChange(t._id, e.target.value, e)}
                          >
                            <option value="open">Open</option>
                            <option value="in-progress">In Progress</option>
                            <option value="closed">Closed</option>
                          </select>
                        )}
                      </td>
                      <td className="py-3 px-2.5 text-xs text-[#acacac]">{t.user_id?.name || '—'}</td>
                      <td className="py-3 px-2.5 text-xs overflow-visible" onClick={(e) => e.stopPropagation()}>
                        {t.approvalStatus === 'suspended' || t.approvalStatus === 'rejected' || t.status === 'closed' ? (
                          <span className="text-white font-medium">{currentTeam ? currentTeam.name : 'Unassigned'}</span>
                        ) : (
                          <div className="relative">
                            <button
                              className="btn btn-sm btn-ghost"
                              disabled={updating === t._id}
                              className="btn btn-sm btn-ghost border border-[var(--color-border)] bg-[var(--color-bg)] text-white text-xs py-1.5 px-3 rounded-md min-w-[140px] text-left flex justify-between items-center cursor-pointer"
                              onClick={() => setActiveAssignTicket(activeAssignTicket === t._id ? null : t._id)}
                            >
                              <span>{currentTeam ? currentTeam.name : 'Unassigned'}</span>
                              <span className="text-[9px] opacity-60">▼</span>
                            </button>

                            {activeAssignTicket === t._id && (
                              <div
                                className="absolute top-full right-0 z-[999] bg-[#181818] border border-[#333] rounded-md p-1.5 min-w-[260px] shadow-[0_8px_24px_rgba(0,0,0,0.6)] mt-1"
                              >
                                <div className="py-1 px-2 text-[10px] text-[#acacac] border-b border-[#222] mb-1.5 flex justify-between">
                                  <span>Category: <strong>{mappedCat}</strong></span>
                                  <button onClick={() => setActiveAssignTicket(null)} className="text-[#ff5f5f] cursor-pointer bg-none border-none text-[10px]">Close</button>
                                </div>
                                
                                <div
                                  className={`py-1.5 px-2 rounded cursor-pointer text-[11px] text-[#e4e4e4] mb-1 hover:bg-[rgba(255,255,255,0.08)] ${!currentTeam ? 'bg-[rgba(20,160,125,0.15)]' : 'bg-transparent'}`}
                                  onClick={() => {
                                    handleTeamChange(t._id, '');
                                    setActiveAssignTicket(null);
                                  }}
                                >
                                  Unassigned
                                </div>

                                {filteredTeams.length > 0 ? (
                                  <>
                                    <div className="pt-1 pb-0.5 px-2 text-[9px] text-[var(--color-teal)] font-semibold uppercase tracking-[0.05em]">Matching Teams</div>
                                    {filteredTeams.map(tm => (
                                      <div
                                        key={tm._id}
                                        className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer text-[11px] text-[#e4e4e4] mb-0.5 hover:bg-[rgba(255,255,255,0.08)] ${currentTeam?._id === tm._id ? 'bg-[rgba(20,160,125,0.15)]' : 'bg-transparent'}`}
                                        onClick={() => {
                                          handleTeamChange(t._id, tm._id);
                                          setActiveAssignTicket(null);
                                        }}
                                      >
                                        <span className="font-medium">{tm.name}</span>
                                        <div className="flex gap-[3px]">
                                          {tm.categories.map(c => (
                                            <span key={c} className="text-[8px] px-1 py-[1px] rounded-[3px] bg-[rgba(255,255,255,0.1)] text-[#ccc]">{c}</span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    <div className="px-2 py-1.5 text-[11px] text-[#ff5f5f] italic">No matching team</div>
                                    <div className="px-2 pt-1 pb-0.5 text-[9px] text-[#888] font-semibold uppercase border-t border-[#222] mt-1">Assign Manually (All Teams)</div>
                                    <div className="max-h-[150px] overflow-y-auto">
                                      {teams.map(tm => (
                                        <div
                                          key={tm._id}
                                          className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-[11px] text-[#e4e4e4] mb-0.5 hover:bg-[rgba(255,255,255,0.08)] ${currentTeam?._id === tm._id ? 'bg-[rgba(20,160,125,0.15)]' : 'bg-transparent'}`}
                                          onClick={() => {
                                            handleTeamChange(t._id, tm._id);
                                            setActiveAssignTicket(null);
                                          }}
                                        >
                                          <span className="font-medium">{tm.name}</span>
                                          <div className="flex gap-[3px]">
                                            {tm.categories.map(c => (
                                              <span key={c} className="text-[8px] px-1 py-[1px] rounded-[3px] bg-[rgba(255,255,255,0.1)] text-[#ccc]">{c}</span>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#acacac] whitespace-nowrap">{formatDate(t.createdAt)}</td>
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 items-center">
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tickets/${t._id}`)}>
                            View
                          </button>
                          {t.approvalStatus === 'rejected' ? (
                            <>
                              <button
                                className="btn btn-sm"
                                className="btn btn-sm bg-[var(--color-teal)] border-none text-black py-1 px-2 rounded cursor-pointer text-[11px] font-semibold"
                                onClick={async () => {
                                  if (!window.confirm('Are you sure you want to reactivate this ticket?')) return;
                                  setUpdating(t._id);
                                  try {
                                    await restoreTicket(t._id);
                                    toast.success('Ticket reactivated successfully');
                                    load();
                                  } catch (err) {
                                    toast.error(err.response?.data?.message || 'Failed to reactivate ticket');
                                  } finally {
                                    setUpdating(null);
                                  }
                                }}
                                disabled={updating === t._id}
                              >
                                Reactivate
                              </button>
                              <button
                                className="btn btn-sm"
                                className="btn btn-sm bg-[#e53e3e] border-none text-white py-1 px-2 rounded cursor-pointer text-[11px] font-semibold"
                                onClick={async () => {
                                  if (!window.confirm('Are you sure you want to permanently delete this ticket?')) return;
                                  setUpdating(t._id);
                                  try {
                                    await deleteTicket(t._id);
                                    toast.success('Ticket deleted successfully');
                                    load();
                                  } catch (err) {
                                    toast.error(err.response?.data?.message || 'Failed to delete ticket');
                                  } finally {
                                    setUpdating(null);
                                  }
                                }}
                                disabled={updating === t._id}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            t.status !== 'closed' && (
                              <>
                                <select
                                  className="select py-1.5 pl-2.5 pr-8 text-xs min-w-[125px] outline-none"
                                  defaultValue=""
                                  onChange={async (e) => {
                                    const cat = e.target.value;
                                    if (!cat) return;
                                    if (window.confirm(`Set category to "${cat}"?`)) {
                                      setUpdating(t._id);
                                      try {
                                        const { setTicketCategory } = await import('../services/ticketApi');
                                        await setTicketCategory(t._id, cat);
                                        toast.success('Category set and ticket allocated successfully');
                                        load();
                                      } catch (err) {
                                        toast.error(err.response?.data?.message || 'Failed to set category');
                                      } finally {
                                        setUpdating(null);
                                      }
                                    }
                                  }}
                                >
                                  <option value="">— Set Cat —</option>
                                  {categories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                <button
                                  className="btn btn-sm"
                                  className="btn btn-sm bg-[#e53e3e] border-none text-white py-1 px-2 rounded cursor-pointer text-[11px] font-semibold"
                                  onClick={async () => {
                                    const reason = window.prompt('Enter reason to decline this ticket:');
                                    if (reason === null) return;
                                    if (reason.length < 5) {
                                      toast.error('Reason must be at least 5 characters');
                                      return;
                                    }
                                    setUpdating(t._id);
                                    try {
                                      const { declineTicket } = await import('../services/ticketApi');
                                      await declineTicket(t._id, reason);
                                      toast.success('Ticket declined successfully');
                                      load();
                                    } catch (err) {
                                      toast.error(err.response?.data?.message || 'Failed to decline ticket');
                                    } finally {
                                      setUpdating(null);
                                    }
                                  }}
                                >
                                  Decline
                                </button>
                              </>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination */}
      {pages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          {pages > 7 && <span className="text-[#acacac] px-1">…</span>}
          <button className="page-btn" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>›</button>
        </div>
      )}
    </div>
  );
};

export default AllTickets;
