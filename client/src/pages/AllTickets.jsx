// ============================================================
//  client/src/pages/AllTickets.jsx  —  Admin/Super Admin Ticket Table
// ============================================================
//  Admin:       sees ALL tickets; can update only ASSIGNED tickets
//  Super Admin: sees ALL tickets; can update + assign all tickets
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Ticket, UserCheck, ShieldCheck } from 'lucide-react';
import { getTickets, updateTicket, getTeams, assignTicketTeam, deleteTicket, restoreTicket } from '../services/ticketApi';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import API from '../services/authApi';

const AllTickets = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tickets,  setTickets]  = useState([]);
  const [teams,    setTeams]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [filters,  setFilters]  = useState({ status: '', priority: '', search: '', team: '', unassignedOnly: false, needsAttention: false, showDeclined: false });
  const [updating, setUpdating] = useState(null);
  const [activeAssignTicket, setActiveAssignTicket] = useState(null);

  const LIMIT = 12;

  const loadTeams = async () => {
    try {
      const { data } = await getTeams();
      setTeams(data.teams || data || []);
    } catch (e) {
      console.error('[AllTickets] load teams error:', e);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
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
    } catch (e) {
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
      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
        <button
          onClick={() => {
            setFilters(f => ({ ...f, needsAttention: false, showDeclined: false }));
            setPage(1);
          }}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: !filters.needsAttention && !filters.showDeclined ? '2px solid var(--color-teal)' : '2px solid transparent',
            color: !filters.needsAttention && !filters.showDeclined ? 'var(--color-teal)' : '#acacac',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          All Tickets
        </button>
        <button
          onClick={() => {
            setFilters(f => ({ ...f, needsAttention: true, showDeclined: false }));
            setPage(1);
          }}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: filters.needsAttention ? '2px solid var(--color-teal)' : '2px solid transparent',
            color: filters.needsAttention ? 'var(--color-teal)' : '#acacac',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ShieldCheck size={16} /> Needs Attention
        </button>
        <button
          onClick={() => {
            setFilters(f => ({ ...f, needsAttention: false, showDeclined: true }));
            setPage(1);
          }}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: filters.showDeclined ? '2px solid var(--color-teal)' : '2px solid transparent',
            color: filters.showDeclined ? 'var(--color-teal)' : '#acacac',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          Declined Tickets
        </button>
      </div>

      {/* ── Filter Bar */}
      <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div className="search-input-wrap" style={{ flex: 1, minWidth: 200 }}>
          <Search size={14} />
          <input
            className="input"
            type="text"
            placeholder="Search by title or ID…"
            value={filters.search}
            onChange={(e) => handleFilter('search', e.target.value)}
          />
        </div>

        <select className="select" style={{ width: 145 }} value={filters.status} onChange={(e) => handleFilter('status', e.target.value)}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>

        <select className="select" style={{ width: 145 }} value={filters.priority} onChange={(e) => handleFilter('priority', e.target.value)}>
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select className="select" style={{ width: 160 }} value={filters.team} onChange={(e) => handleFilter('team', e.target.value)}>
          <option value="">All Teams</option>
          {teams.map(t => (
            <option key={t.teamId || t._id} value={t.teamId || t._id}>{t.name}</option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#acacac', cursor: 'pointer', padding: '0 8px' }}>
          <input 
            type="checkbox" 
            checked={filters.unassignedOnly} 
            onChange={(e) => handleFilter('unassignedOnly', e.target.checked)} 
            style={{ width: 14, height: 14 }}
          />
          Show unassigned only
        </label>

        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ status: '', priority: '', search: '', team: '', unassignedOnly: false }); setPage(1); }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Needs Attention Info Banner */}
      {filters.needsAttention && (
        <div style={{
          background: 'rgba(211,167,60,0.04)',
          border: '1px dashed rgba(211,167,60,0.3)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: 13,
          color: '#d3a73c',
          lineHeight: 1.5
        }}>
          <strong>What is "Needs Attention"?</strong> This view displays tickets that require immediate Admin action:
          <ul style={{ margin: '4px 0 0 20px', padding: 0, listStyleType: 'disc' }}>
            <li><strong>Pending Allocation:</strong> Newly created tickets submitted without a category. Admins must set a category to trigger auto-allocation or assign a team manually.</li>
            <li><strong>Transferred to Admin:</strong> Tickets that were transferred back to Admins by support teams, requiring manual review or reallocation.</li>
          </ul>
        </div>
      )}

      {/* ── Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="empty-state" style={{ border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <Ticket size={44} strokeWidth={1.5} />
          <h3>No tickets found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'visible' }}>
          <div className="table-wrap" style={{ overflow: 'visible' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>#ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Team Assigned</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Created</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Actions</th>
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
                      style={{
                        borderBottom: '1px solid var(--color-border-soft)',
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '13px 16px', color: '#555', fontFamily: 'monospace', fontSize: 11 }}>
                        #{t._id.slice(-6).toUpperCase()}
                      </td>
                      <td style={{ padding: '13px 16px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: '#e4e4e4' }}>
                        {t.title}
                      </td>
                      <td style={{ padding: '13px 16px', textTransform: 'capitalize', fontSize: 12, color: '#acacac' }}>{t.category || 'General'}</td>
                      <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                        {t.approvalStatus === 'rejected' || t.status === 'closed' ? (
                          <span style={{ textTransform: 'capitalize', color: '#acacac' }}>{t.priority}</span>
                        ) : (
                          <select
                            style={{
                              padding: '4px 6px', fontSize: 11, background: '#111',
                              border: '1px solid #3a3a3a', color: '#e4e4e4', borderRadius: 4, cursor: 'pointer',
                            }}
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
                      <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                        {t.approvalStatus === 'rejected' ? (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: 11 }}>
                            Declined
                          </span>
                        ) : t.status === 'closed' ? (
                          <span style={{ textTransform: 'capitalize', color: '#acacac' }}>{t.status}</span>
                        ) : (
                          <select
                            style={{
                              padding: '4px 6px', fontSize: 11, background: '#111',
                              border: '1px solid #3a3a3a', color: '#e4e4e4', borderRadius: 4, cursor: 'pointer',
                            }}
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
                      <td style={{ padding: '13px 16px', fontSize: 12, color: '#acacac' }}>{t.user_id?.name || '—'}</td>
                      <td style={{ padding: '13px 16px', fontSize: 12, overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
                        {t.approvalStatus === 'rejected' || t.status === 'closed' ? (
                          <span style={{ color: '#fff', fontWeight: 500 }}>{currentTeam ? currentTeam.name : 'Unassigned'}</span>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <button
                              className="btn btn-sm btn-ghost"
                              disabled={updating === t._id}
                              style={{
                                border: '1px solid #3a3a3a',
                                background: '#111',
                                color: '#e4e4e4',
                                fontSize: 11,
                                padding: '4px 8px',
                                borderRadius: 4,
                                minWidth: 140,
                                textAlign: 'left',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer'
                              }}
                              onClick={() => setActiveAssignTicket(activeAssignTicket === t._id ? null : t._id)}
                            >
                              <span>{currentTeam ? currentTeam.name : 'Unassigned'}</span>
                              <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
                            </button>

                            {activeAssignTicket === t._id && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  zIndex: 999,
                                  background: '#181818',
                                  border: '1px solid #333',
                                  borderRadius: 6,
                                  padding: 6,
                                  minWidth: 260,
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                                  marginTop: 4,
                                }}
                              >
                                <div style={{ padding: '4px 8px', fontSize: 10, color: '#acacac', borderBottom: '1px solid #222', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Category: <strong>{mappedCat}</strong></span>
                                  <button onClick={() => setActiveAssignTicket(null)} style={{ color: '#ff5f5f', cursor: 'pointer', background: 'none', border: 'none', fontSize: 10 }}>Close</button>
                                </div>
                                
                                <div
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    color: '#e4e4e4',
                                    background: !currentTeam ? 'rgba(20,160,125,0.15)' : 'transparent',
                                    marginBottom: 4,
                                  }}
                                  onClick={() => {
                                    handleTeamChange(t._id, '');
                                    setActiveAssignTicket(null);
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = !currentTeam ? 'rgba(20,160,125,0.15)' : 'transparent'}
                                >
                                  Unassigned
                                </div>

                                {filteredTeams.length > 0 ? (
                                  <>
                                    <div style={{ padding: '4px 8px 2px 8px', fontSize: 9, color: 'var(--color-teal)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matching Teams</div>
                                    {filteredTeams.map(tm => (
                                      <div
                                        key={tm._id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '6px 8px',
                                          borderRadius: 4,
                                          cursor: 'pointer',
                                          fontSize: 11,
                                          color: '#e4e4e4',
                                          background: currentTeam?._id === tm._id ? 'rgba(20,160,125,0.15)' : 'transparent',
                                          marginBottom: 2,
                                        }}
                                        onClick={() => {
                                          handleTeamChange(t._id, tm._id);
                                          setActiveAssignTicket(null);
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = currentTeam?._id === tm._id ? 'rgba(20,160,125,0.15)' : 'transparent'}
                                      >
                                        <span style={{ fontWeight: 500 }}>{tm.name}</span>
                                        <div style={{ display: 'flex', gap: 3 }}>
                                          {tm.categories.map(c => (
                                            <span key={c} style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'rgba(255,255,255,0.1)', color: '#ccc' }}>{c}</span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    <div style={{ padding: '6px 8px', fontSize: 11, color: '#ff5f5f', fontStyle: 'italic' }}>No matching team</div>
                                    <div style={{ padding: '4px 8px 2px 8px', fontSize: 9, color: '#888', fontWeight: 600, textTransform: 'uppercase', borderTop: '1px solid #222', marginTop: 4 }}>Assign Manually (All Teams)</div>
                                    <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                                      {teams.map(tm => (
                                        <div
                                          key={tm._id}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '6px 8px',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            fontSize: 11,
                                            color: '#e4e4e4',
                                            background: currentTeam?._id === tm._id ? 'rgba(20,160,125,0.15)' : 'transparent',
                                            marginBottom: 2,
                                          }}
                                          onClick={() => {
                                            handleTeamChange(t._id, tm._id);
                                            setActiveAssignTicket(null);
                                          }}
                                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                          onMouseLeave={(e) => e.currentTarget.style.background = currentTeam?._id === tm._id ? 'rgba(20,160,125,0.15)' : 'transparent'}
                                        >
                                          <span style={{ fontWeight: 500 }}>{tm.name}</span>
                                          <div style={{ display: 'flex', gap: 3 }}>
                                            {tm.categories.map(c => (
                                              <span key={c} style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'rgba(255,255,255,0.1)', color: '#ccc' }}>{c}</span>
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
                      <td style={{ padding: '13px 16px', fontSize: 12, color: '#acacac', whiteSpace: 'nowrap' }}>{formatDate(t.createdAt)}</td>
                      <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tickets/${t._id}`)}>
                            View
                          </button>
                          {t.approvalStatus === 'rejected' ? (
                            <>
                              <button
                                className="btn btn-sm"
                                style={{ background: 'var(--color-teal)', border: 'none', color: '#000', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
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
                                style={{ background: '#e53e3e', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
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
                                  style={{
                                    padding: '4px 6px', fontSize: 11, background: '#111',
                                    border: '1px solid #3a3a3a', color: '#e4e4e4', borderRadius: 4, cursor: 'pointer',
                                  }}
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
                                  <option value="General">General</option>
                                  <option value="Technical">Technical</option>
                                  <option value="Billing">Billing</option>
                                  <option value="HR">HR</option>
                                  <option value="Other">Other</option>
                                </select>
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#e53e3e', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
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
          {pages > 7 && <span style={{ color: '#acacac', padding: '0 4px' }}>…</span>}
          <button className="page-btn" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>›</button>
        </div>
      )}
    </div>
  );
};

export default AllTickets;
