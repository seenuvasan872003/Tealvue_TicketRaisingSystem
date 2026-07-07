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
  RefreshCw,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getTeamsDashboard, getTickets } from '../services/ticketApi';
import API from '../services/authApi';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import logger from '../utils/logger';

import { SkeletonCard, SkeletonTable, SkeletonText } from '../components/skeletons';

const TeamDashboard = () => {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Details Modal State
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamTickets, setTeamTickets] = useState([]);
  const [teamLogs, setTeamLogs] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchDashboardData = async () => {
    logger.info('TeamDashboard', 'fetchDashboardData', 'Loading team dashboard statistics', { api: '/api/teams/dashboard', method: 'GET', action: 'Team Dashboard Load Start' });
    try {
      setLoading(true);
      const { data } = await getTeamsDashboard();
      setData(data);
      logger.info('TeamDashboard', 'fetchDashboardData', `Team dashboard loaded — ${(data.teams || []).length} teams`, { api: '/api/teams/dashboard', method: 'GET', status: 200, action: 'Team Dashboard Load Success' });
    } catch (err) {
      logger.error('TeamDashboard', 'fetchDashboardData', 'Failed to load team dashboard stats', err, { api: '/api/teams/dashboard', method: 'GET', action: 'Team Dashboard Load Failure' });
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

      // 3. Fetch member performance for this team
      const pRes = await API.get(`/teams/${team.teamId}/performance`);
      setTeamMembers(pRes.data.memberPerformance || []);
    } catch (err) {
      toast.error('Failed to load team details');
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="page-body fade-in">
        <div className="page-header flex justify-between items-center mb-6">
          <div className="flex flex-col gap-2 w-1/3">
            <SkeletonText height="24px" width="60%" />
            <SkeletonText height="14px" width="100%" />
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 mb-6">
          <SkeletonCard height="110px" />
          <SkeletonCard height="110px" />
          <SkeletonCard height="110px" />
          <SkeletonCard height="110px" />
        </div>
        <SkeletonTable rows={4} columns={5} />
      </div>
    );
  }

  const { summary, teams = [] } = data || {};

  return (
    <div className="page-body fade-in">
      <div className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">Team Progress Dashboard</h1>
          <p className="page-subtitle">Overview of specialized support teams' workload and allocation metrics.</p>
        </div>
        <div className="flex gap-3 items-center">
          {isSuperAdmin && (
            <button 
              className="btn btn-primary flex items-center gap-1.5"
              onClick={() => navigate('/super-admin/categories')}
            >
              Manage Categories
            </button>
          )}
          <button 
            className="btn btn-ghost flex items-center gap-1.5"
            onClick={fetchDashboardData}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="stat-grid mb-7">
        <div className="stat-card teal">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">Total Teams</div>
              <div className="stat-value">{summary?.totalTeams ?? 0}</div>
            </div>
            <Users size={24} className="opacity-50" />
          </div>
        </div>
        <div className="stat-card blue">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">Total Allocated Tickets</div>
              <div className="stat-value">{summary?.totalTickets ?? 0}</div>
            </div>
            <Ticket size={24} className="opacity-50" />
          </div>
        </div>
        <div className="stat-card green">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">Avg Completion %</div>
              <div className="stat-value">{summary?.avgCompletionRate ?? 0}%</div>
            </div>
            <Percent size={24} className="opacity-50" />
          </div>
        </div>
        <div className="stat-card orange">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">Auto-Allocated Tickets</div>
              <div className="stat-value">{summary?.autoAllocatedCount ?? 0}</div>
            </div>
            <Sliders size={24} className="opacity-50" />
          </div>
        </div>
      </div>

      {/* Teams Cards Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
        {teams.length === 0 ? (
          <div className="card col-span-full text-center p-10 text-[var(--color-text-muted)]">
            No teams setup in the system.
          </div>
        ) : (
          teams.map((team) => {
            const openVal = team.open || 0;
            const progressVal = team.inProgress || 0;
            const closedVal = team.closed || 0;
            const transferredVal = team.transferred || 0;

            const chartData = [
              { name: 'Open', value: openVal, color: '#3fb950' },
              { name: 'Progress', value: progressVal, color: '#d29922' },
              { name: 'Closed', value: closedVal, color: '#6e7681' },
              { name: 'Transfer', value: transferredVal, color: '#ef4444' },
            ].filter(d => d.value > 0);

            // Fallback empty state for chart
            const hasData = chartData.length > 0;
            const displayChartData = hasData ? chartData : [{ name: 'Empty', value: 1, color: '#252525' }];

            return (
              <div key={team.teamId} className="card flex flex-col gap-4 p-6">
                {/* Header Row */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 onClick={() => openDetailsModal(team)} className="clickable-title text-lg font-semibold m-0 text-white cursor-pointer">
                      {team.name}
                    </h3>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">
                      Admin: <strong className="text-white">{team.teamAdmin?.name || 'Unassigned'}</strong> • {team.membersCount} agents
                    </div>
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {team.categories.map((c, i) => (
                        <span key={i} className="text-[10px] py-0.5 px-2 bg-[#202020] rounded text-[#acacac] capitalize">{c}</span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Team Completion Rate Ring */}
                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg width="48" height="48" className="-rotate-90">
                      <circle cx="24" cy="24" r="19" fill="transparent" stroke="#252525" strokeWidth="3.5" />
                      <circle
                        cx="24"
                        cy="24"
                        r="19"
                        fill="transparent"
                        stroke="var(--color-teal)"
                        strokeWidth="3.5"
                        strokeDasharray={2 * Math.PI * 19}
                        strokeDashoffset={2 * Math.PI * 19 * (1 - team.completionRate / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-white">{team.completionRate}%</span>
                  </div>
                </div>

                {/* Unified Circle / Pie Chart & Detailed Stats Row */}
                <div className="flex gap-4 items-center py-4 border-t border-b border-[#252525]">
                  {/* Left: Recharts Doughnut/Circle Chart */}
                  <div className="w-[100px] h-[100px] relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={22}
                          outerRadius={38}
                          paddingAngle={hasData ? 3 : 0}
                          dataKey="value"
                        >
                          {displayChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-base font-extrabold text-white">{team.total}</span>
                      <span className="text-[8px] text-[var(--color-text-muted)] uppercase">Total</span>
                    </div>
                  </div>

                  {/* Right: Detailed Legend & Data List */}
                  <div className="flex-1 grid grid-cols-2 gap-y-2 gap-x-4 pl-2">
                    <div className="flex items-center justify-between bg-[#141414] rounded px-2 py-1 border border-[#202020]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
                        <span className="text-[11px] text-[var(--color-text-muted)]">Open</span>
                      </div>
                      <strong className="text-xs text-[#3fb950]">{openVal}</strong>
                    </div>

                    <div className="flex items-center justify-between bg-[#141414] rounded px-2 py-1 border border-[#202020]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d29922]" />
                        <span className="text-[11px] text-[var(--color-text-muted)]">Progress</span>
                      </div>
                      <strong className="text-xs text-[#d29922]">{progressVal}</strong>
                    </div>

                    <div className="flex items-center justify-between bg-[#141414] rounded px-2 py-1 border border-[#202020]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6e7681]" />
                        <span className="text-[11px] text-[var(--color-text-muted)]">Closed</span>
                      </div>
                      <strong className="text-xs text-[#9ca3af]">{closedVal}</strong>
                    </div>

                    <div className="flex items-center justify-between bg-[#141414] rounded px-2 py-1 border border-[#202020]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                        <span className="text-[11px] text-[var(--color-text-muted)]">Transfer</span>
                      </div>
                      <strong className="text-xs text-[#ef4444]">{transferredVal}</strong>
                    </div>
                  </div>
                </div>

                <button className="btn btn-ghost w-full justify-center" onClick={() => navigate(`/teams/${team.teamId || team._id}/performance`)}>
                  View Performance Details <ChevronRight size={14} className="ml-1" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Team Details Modal */}
      {selectedTeam && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-[800px] w-[90%] max-h-[85vh] flex flex-col">
            <div className="modal-header">
              <div>
                <h3 className="m-0">{selectedTeam.name}</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0 mx-0">Admin: {selectedTeam.teamAdmin?.name || 'Unassigned'} • {selectedTeam.membersCount} active agents</p>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            
            {modalLoading ? (
              <div className="p-10 text-center flex-1"><div className="spinner" /></div>
            ) : (
              <div className="overflow-y-auto pr-1.5 flex flex-col gap-5 flex-1 mt-3.5">
                {/* Team Admin Account Credentials Box */}
                <div className="card p-4 bg-[rgba(20,160,125,0.04)] border border-[rgba(20,160,125,0.15)] rounded-lg">
                  <h4 className="m-0 mb-2 text-[13px] text-[var(--color-teal)] font-semibold">Team Admin Account Credentials</h4>
                  <div className="grid grid-cols-2 gap-4 text-[13px]">
                    <div>
                      <span className="text-[var(--color-text-muted)] block text-[11px]">Login Email:</span>
                      <strong className="text-white">{selectedTeam.teamAdmin?.email || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)] block text-[11px]">Login Password:</span>
                      <strong className="text-[#eac253] font-mono">{selectedTeam.teamAdminPassword || 'password123'}</strong>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedTeam.description && (
                  <div className="card p-3 bg-[rgba(255,255,255,0.02)]">
                    <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Description</div>
                    <div className="text-[13px] text-[#acacac] leading-relaxed">{selectedTeam.description}</div>
                  </div>
                )}

                {/* Dashboard statistics section */}
                <div className="grid grid-cols-[2fr_1fr] gap-4 min-h-[180px]">
                  {/* Status Breakdown Doughnut Chart */}
                  <div className="card flex flex-col">
                    <div className="text-[13px] font-semibold text-white mb-3">Status Distribution</div>
                    <div className="flex-1 h-[130px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Open', value: selectedTeam.open || 0, color: '#3fb950' },
                              { name: 'In Progress', value: selectedTeam.inProgress || 0, color: '#d29922' },
                              { name: 'Closed', value: selectedTeam.closed || 0, color: '#6e7681' },
                              { name: 'Transferred', value: selectedTeam.transferred || 0, color: '#ef4444' },
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
                              { name: 'Closed', color: '#6e7681' },
                              { name: 'Transferred', color: '#ef4444' }
                            ].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#111', border: '1px solid #2d2d2d', borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Summary counts */}
                  <div className="card flex flex-col justify-center gap-3">
                    <div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">Completion Rate</div>
                      <div className="text-[22px] font-bold text-[var(--color-teal)]">{selectedTeam.completionRate}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">Auto-Allocation Share</div>
                      <div className="text-lg font-bold text-white">
                        {teamTickets.filter(t => t.autoAllocated).length} / {teamTickets.length} tickets
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Members & Performance */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2.5">Team Members & Performance</h4>
                  <div className="table-wrap max-h-[220px] overflow-y-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-border)]">
                          <th className="py-2.5 px-3.5 text-left text-[#acacac] font-semibold">Agent Name</th>
                          <th className="py-2.5 px-3.5 text-left text-[#acacac] font-semibold">Email</th>
                          <th className="py-2.5 px-3.5 text-center text-[#acacac] font-semibold">Total</th>
                          <th className="py-2.5 px-3.5 text-center text-[#acacac] font-semibold">Open</th>
                          <th className="py-2.5 px-3.5 text-center text-[#acacac] font-semibold">Progress</th>
                          <th className="py-2.5 px-3.5 text-center text-[#acacac] font-semibold">Closed</th>
                          <th className="py-2.5 px-3.5 text-center text-[#acacac] font-semibold">Completion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center text-[var(--color-text-muted)] p-5">No agents assigned to this team.</td>
                          </tr>
                        ) : (
                          teamMembers.map(m => (
                            <tr key={m._id} className="border-b border-[var(--color-border-soft)]">
                              <td className="py-2.5 px-3.5">
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${m.isActive ? 'bg-[#3fb950]' : 'bg-[#ef4444]'}`} />
                                  <strong className="text-[#e4e4e4]">{m.name}</strong>
                                </div>
                              </td>
                              <td className="py-2.5 px-3.5 text-[var(--color-text-muted)]">{m.email}</td>
                              <td className="py-2.5 px-3.5 text-center text-white">{m.total}</td>
                              <td className="py-2.5 px-3.5 text-center text-[#3fb950] font-semibold">{m.open}</td>
                              <td className="py-2.5 px-3.5 text-center text-[#d29922] font-semibold">{m.inProgress}</td>
                              <td className="py-2.5 px-3.5 text-center text-[#9ca3af] font-semibold">{m.closed}</td>
                              <td className="py-2.5 px-3.5 text-center font-bold text-[var(--color-teal)]">{m.completionRate}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ticket History */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2.5">Assigned Tickets History</h4>
                  <div className="table-wrap max-h-[220px] overflow-y-auto">
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
                            <td colSpan="5" className="text-center text-[var(--color-text-muted)] p-3">No tickets allocated to this team.</td>
                          </tr>
                        ) : (
                          teamTickets.map(t => (
                            <tr
                              key={t._id}
                              onClick={() => navigate(`/tickets/${t._id}`)}
                              className="cursor-pointer transition-colors duration-100 hover:bg-[rgba(255,255,255,0.03)]"
                            >
                              <td className="font-mono text-[11px] text-[var(--color-text-muted)]">{t._id.slice(-6).toUpperCase()}</td>
                              <td className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap font-medium text-[#e4e4e4]">
                                {t.title}
                              </td>
                              <td onClick={(e) => e.stopPropagation()}><StatusBadge status={t.status} /></td>
                              <td onClick={(e) => e.stopPropagation()}><PriorityBadge priority={t.priority} /></td>
                              <td className="capitalize">{t.category}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Assignment Timeline (Logs) */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2.5">Recent Activity Log (30 Days)</h4>
                  <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {teamLogs.length === 0 ? (
                      <div className="text-center p-4 text-[var(--color-text-muted)] border border-dashed border-[#252525] rounded-lg text-[13px]">No recent activity records.</div>
                    ) : (
                      teamLogs.map(log => (
                        <div key={log._id} className="flex gap-2.5 bg-[#111] border border-[#252525] rounded-md py-2 px-3 text-xs">
                          <Clock size={13} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <div className="flex justify-between text-[var(--color-text-muted)] text-[10px]">
                              <span>{log.action.replace(/_/g, ' ')}</span>
                              <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="text-[#acacac] mt-0.5">{log.note}</div>
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
