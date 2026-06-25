import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Ticket,
  Clock,
  Percent,
  Sliders,
  X,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getTeamsDashboard, getTickets } from '../services/ticketApi';
import API from '../services/authApi';
import { toast } from 'react-toastify';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';

const TeamDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Details Modal State
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamTickets, setTeamTickets] = useState([]);
  const [teamLogs, setTeamLogs] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data } = await getTeamsDashboard();
      setData(data);
    } catch (err) {
      toast.error('Failed to load team dashboard stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openDetailsModal = async (team) => {
    setSelectedTeam(team);
    setModalLoading(true);
    try {
      // 1. Fetch tickets for this team
      const tRes = await getTickets({ teamId: team.teamId, limit: 100 });
      setTeamTickets(tRes.data.tickets || []);
      
      // 2. Fetch logs for this team
      const lRes = await API.get(`/logs?range=monthly&teamId=${team.teamId}`);
      setTeamLogs(lRes.data || []);
    } catch (err) {
      toast.error('Failed to load team details');
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  if (loading && !data) {
    return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>;
  }

  const { summary, teams = [] } = data || {};

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Progress Dashboard</h1>
          <p className="page-subtitle">Overview of specialized support teams' workload and allocation metrics.</p>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card teal">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Total Teams</div>
              <div className="stat-value">{summary?.totalTeams ?? 0}</div>
            </div>
            <Users size={24} style={{ opacity: 0.5 }} />
          </div>
        </div>
        <div className="stat-card blue">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Total Allocated Tickets</div>
              <div className="stat-value">{summary?.totalTickets ?? 0}</div>
            </div>
            <Ticket size={24} style={{ opacity: 0.5 }} />
          </div>
        </div>
        <div className="stat-card green">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Avg Completion %</div>
              <div className="stat-value">{summary?.avgCompletionRate ?? 0}%</div>
            </div>
            <Percent size={24} style={{ opacity: 0.5 }} />
          </div>
        </div>
        <div className="stat-card orange">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Auto-Allocated Tickets</div>
              <div className="stat-value">{summary?.autoAllocatedCount ?? 0}</div>
            </div>
            <Sliders size={24} style={{ opacity: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Teams Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        {teams.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
            No teams setup in the system.
          </div>
        ) : (
          teams.map((team) => {
            const openVal = team.open || 0;
            const progressVal = team.inProgress || 0;
            const closedVal = team.closed || 0;
            const totalVal = team.total || 0;
            
            const pctOpen = totalVal > 0 ? (openVal / totalVal) * 100 : 0;
            const pctProgress = totalVal > 0 ? (progressVal / totalVal) * 100 : 0;
            const pctClosed = totalVal > 0 ? (closedVal / totalVal) * 100 : 0;

            return (
              <div key={team.teamId} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#fff' }} onClick={() => openDetailsModal(team)} className="clickable-title">
                      {team.name}
                    </h3>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      Admin: {team.teamAdmin?.name || 'Unassigned'} • {team.membersCount} agents
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      {team.categories.map((c, i) => (
                        <span key={i} style={{ fontSize: 9, padding: '1px 6px', background: '#252525', borderRadius: 4, color: '#acacac' }}>{c}</span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Progress ring percentage */}
                  <div style={{ position: 'relative', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="50" height="50" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="25" cy="25" r="20" fill="transparent" stroke="#252525" strokeWidth="4" />
                      <circle
                        cx="25"
                        cy="25"
                        r="20"
                        fill="transparent"
                        stroke="var(--color-teal)"
                        strokeWidth="4"
                        strokeDasharray={2 * Math.PI * 20}
                        strokeDashoffset={2 * Math.PI * 20 * (1 - team.completionRate / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: 10, fontWeight: 700, color: '#fff' }}>{team.completionRate}%</span>
                  </div>
                </div>

                {/* Segments mini-bar */}
                <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#252525' }}>
                  {openVal > 0 && <div style={{ width: `${pctOpen}%`, background: '#3fb950' }} title={`Open: ${openVal}`} />}
                  {progressVal > 0 && <div style={{ width: `${pctProgress}%`, background: '#d29922' }} title={`In Progress: ${progressVal}`} />}
                  {closedVal > 0 && <div style={{ width: `${pctClosed}%`, background: '#6e7681' }} title={`Closed: ${closedVal}`} />}
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '8px 0', borderTop: '1px solid #252525', borderBottom: '1px solid #252525', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Total</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 2 }}>{team.total}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#3fb950' }}>Open</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#3fb950', marginTop: 2 }}>{team.open}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#d29922' }}>In Progress</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#d29922', marginTop: 2 }}>{team.inProgress}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#6e7681' }}>Closed</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#6e7681', marginTop: 2 }}>{team.closed}</div>
                  </div>
                </div>

                <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate(`/teams/${team.teamId || team._id}/performance`)}>
                  View Performance Details <ChevronRight size={14} style={{ marginLeft: 4 }} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Team Details Modal */}
      {selectedTeam && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 800, width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{selectedTeam.name}</h3>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>Admin: {selectedTeam.teamAdmin?.name || 'Unassigned'} • {selectedTeam.membersCount} active agents</p>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            
            {modalLoading ? (
              <div style={{ padding: 40, textAlign: 'center', flex: 1 }}><div className="spinner" /></div>
            ) : (
              <div style={{ overflowY: 'auto', paddingRight: 6, display: 'flex', flexDirection: 'column', gap: 20, flex: 1, marginTop: 14 }}>
                {/* Team Admin Account Credentials Box */}
                <div className="card" style={{ padding: 16, background: 'rgba(20,160,125,0.04)', border: '1px solid rgba(20,160,125,0.15)', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--color-teal)', fontWeight: 600 }}>Team Admin Account Credentials</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: 11 }}>Login Email:</span>
                      <strong style={{ color: '#fff' }}>{selectedTeam.teamAdmin?.email || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: 11 }}>Login Password:</span>
                      <strong style={{ color: '#eac253', fontFamily: 'monospace' }}>{selectedTeam.teamAdminPassword || 'password123'}</strong>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedTeam.description && (
                  <div className="card" style={{ padding: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
                    <div style={{ fontSize: 13, color: '#acacac', lineHeight: 1.5 }}>{selectedTeam.description}</div>
                  </div>
                )}

                {/* Dashboard statistics section */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, minHeight: 180 }}>
                  {/* Status Breakdown Doughnut Chart */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Status Distribution</div>
                    <div style={{ flex: 1, height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Open', value: selectedTeam.open || 0, color: '#3fb950' },
                              { name: 'In Progress', value: selectedTeam.inProgress || 0, color: '#d29922' },
                              { name: 'Closed', value: selectedTeam.closed || 0, color: '#6e7681' },
                            ].filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={45}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                          >
                            {[
                              { name: 'Open', color: '#3fb950' },
                              { name: 'In Progress', color: '#d29922' },
                              { name: 'Closed', color: '#6e7681' }
                            ].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#111', border: '1px solid #2d2d2d', borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Summary counts */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Completion Rate</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-teal)' }}>{selectedTeam.completionRate}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Auto-Allocation Share</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                        {teamTickets.filter(t => t.autoAllocated).length} / {teamTickets.length} tickets
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ticket History */}
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 10 }}>Assigned Tickets History</h4>
                  <div className="table-wrap" style={{ maxHeight: 220, overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamTickets.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 12 }}>No tickets allocated to this team.</td>
                          </tr>
                        ) : (
                          teamTickets.map(t => (
                            <tr key={t._id}>
                              <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>{t._id.slice(-6).toUpperCase()}</td>
                              <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <a href={`/tickets/${t._id}`} style={{ color: 'var(--color-teal)', textDecoration: 'underline' }}>{t.title}</a>
                              </td>
                              <td><StatusBadge status={t.status} /></td>
                              <td><PriorityBadge priority={t.priority} /></td>
                              <td style={{ textTransform: 'capitalize' }}>{t.category}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Assignment Timeline (Logs) */}
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 10 }}>Recent Activity Log (30 Days)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                    {teamLogs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 16, color: 'var(--color-text-muted)', border: '1px dashed #252525', borderRadius: 8, fontSize: 13 }}>No recent activity records.</div>
                    ) : (
                      teamLogs.map(log => (
                        <div key={log._id} style={{ display: 'flex', gap: 10, background: '#111', border: '1px solid #252525', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                          <Clock size={13} style={{ color: 'var(--color-text-muted)', marginTop: 2, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: 10 }}>
                              <span>{log.action.replace(/_/g, ' ')}</span>
                              <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div style={{ color: '#acacac', marginTop: 2 }}>{log.note}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDashboard;
