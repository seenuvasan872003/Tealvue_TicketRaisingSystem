// ============================================================
//  client/src/pages/Dashboard.jsx  —  Role-aware Dashboard
// ============================================================
//  Updated for Phase 7: Recharts integration for Admins
// ============================================================

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ticket, CircleDot, RotateCcw, CheckCircle2, Plus,
  AlertTriangle, Minus, Activity, Calendar, User, Hash, XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminStats, getMyStats, getTickets,
  getGrowthData, getStatusBreakdown,
  getMyTeam, getTeamMembers
} from '../services/ticketApi';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

const StatCard = ({ label, value, color, Icon }) => (
  <div className={`stat-card ${color}`}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value ?? '—'}</div>
      </div>
      <Icon size={24} strokeWidth={1.5} style={{ opacity: 0.5 }} />
    </div>
  </div>
);

const Dashboard = () => {
  const { user, isAdminLevel } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chart Data State
  const [growthData, setGrowthData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [priorityChartData, setPriorityChartData] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamMembersChartData, setTeamMembersChartData] = useState([]);
  const [memberPage, setMemberPage] = useState(1);
  const membersPerPage = 4;

  useEffect(() => {
    const load = async () => {
      try {
        if (user?.role === 'team_admin' || user?.role === 'team_user') {
          const [ticketsRes, teamRes] = await Promise.all([
            getTickets({ page: 1, limit: 1000 }),
            getMyTeam().catch(() => ({ data: null }))
          ]);
          const ticketsList = ticketsRes.data.tickets || [];
          const myTeam = teamRes?.data;
          const myTeamId = myTeam?._id;

          // Filter to only include tickets that actively belong to this team (not transferred to admin, and not reallocated away)
          const activeTickets = ticketsList.filter(t => {
            const tTeamId = t.teamId?._id || t.teamId;
            const tReallocatedFrom = t.reallocatedFromTeamId?._id || t.reallocatedFromTeamId;
            
            // Exclude transferred tickets
            if (t.allocationStatus === 'transferred_to_admin') return false;
            
            // Exclude tickets reallocated away from this team
            if (myTeamId && tReallocatedFrom === myTeamId && tTeamId !== myTeamId) return false;
            
            // Must belong to this team
            return myTeamId ? tTeamId === myTeamId : true;
          });
          
          const total = ticketsList.length;
          const open = activeTickets.filter(t => t.status === 'open').length;
          const inProgress = activeTickets.filter(t => t.status === 'in-progress').length;
          const closed = activeTickets.filter(t => t.status === 'closed').length;
          const transferred = total - activeTickets.length;
          
          const urgent = activeTickets.filter(t => t.priority === 'urgent').length;
          const high = activeTickets.filter(t => t.priority === 'high').length;
          const medium = activeTickets.filter(t => t.priority === 'medium').length;
          const low = activeTickets.filter(t => t.priority === 'low').length;

          setStats({ total, open, inProgress, closed, transferred, urgent, high, medium, low });
          setRecent(activeTickets.slice(0, 5));

          setPieData([
            { name: 'Open', value: open, color: '#3fb950' },
            { name: 'In Progress', value: inProgress, color: '#d29922' },
            { name: 'Closed', value: closed, color: '#6e7681' },
          ].filter(x => x.value > 0));

          setPriorityChartData([
            { name: 'Low', value: low, color: '#3fb950' },
            { name: 'Medium', value: medium, color: '#d29922' },
            { name: 'High', value: high, color: '#f85149' },
            { name: 'Urgent', value: urgent, color: '#f85149' },
          ]);

          // Fetch team members workload for team_admin
          if (user?.role === 'team_admin' && myTeam) {
            try {
              const membersRes = await getTeamMembers(myTeam._id);
              const membersList = membersRes.data || [];
              
              const membersWithStats = membersList.map(member => {
                const memberTickets = activeTickets.filter(t => t.assignedToUser?._id === member._id || t.assignedToUser === member._id);
                const active = memberTickets.filter(t => t.status === 'in-progress' || t.status === 'open').length;
                const resolved = memberTickets.filter(t => t.status === 'closed').length;
                return {
                  ...member,
                  activeCount: active,
                  resolvedCount: resolved,
                };
              });
              setTeamMembers(membersWithStats);
              setTeamMembersChartData(membersWithStats.map(m => ({
                name: m.name,
                'Active Tickets': m.activeCount,
                'Resolved Tickets': m.resolvedCount,
              })));
            } catch (err) {
              console.error('[Dashboard] Team members load error:', err);
            }
          }
        } else {
          const [statsRes, ticketsRes] = await Promise.all([
            isAdminLevel ? getAdminStats() : getMyStats(),
            getTickets({ page: 1, limit: 5 }),
          ]);
          setStats(statsRes.data);
          setRecent(ticketsRes.data.tickets);

          if (isAdminLevel) {
            const [gRes, pRes] = await Promise.all([
              getGrowthData(), getStatusBreakdown()
            ]);
            setGrowthData(gRes.data);
            
            // Format Pie Chart
            const rawPie = pRes.data || [];
            setPieData([
              { name: 'Open', value: rawPie.find(x => x.status === 'open' || x._id === 'open')?.count || 0, color: '#3fb950' },
              { name: 'In Progress', value: rawPie.find(x => x.status === 'in-progress' || x._id === 'in-progress')?.count || 0, color: '#d29922' },
              { name: 'Closed', value: rawPie.find(x => x.status === 'closed' || x._id === 'closed')?.count || 0, color: '#6e7681' },
              { name: 'Declined', value: rawPie.find(x => x.status === 'declined' || x._id === 'declined')?.count || 0, color: '#f85149' },
            ].filter(x => x.value > 0));
          }
        }
      } catch (e) {
        console.error('[Dashboard] load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdminLevel, user]);

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>;

  // Sliced team members for pagination (3-4 users, others are slider/paginated)
  const indexOfLastMember = memberPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = teamMembers.slice(indexOfFirstMember, indexOfLastMember);
  const totalMemberPages = Math.ceil(teamMembers.length / membersPerPage) || 1;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]}</h1>
          <p className="page-subtitle">{isAdminLevel ? "Here's what's happening with tickets today." : 'Track and manage your support tickets.'}</p>
        </div>
        {user?.role === 'user' && (
          <Link to="/tickets/create" className="btn btn-primary"><Plus size={15} /> New Ticket</Link>
        )}
      </div>

      <div className="stat-grid">
        <StatCard label="Total Tickets" value={stats?.total} color="teal" Icon={Ticket} />
        <StatCard label="Open" value={stats?.open} color="green" Icon={CircleDot} />
        <StatCard label="In Progress" value={stats?.inProgress} color="yellow" Icon={RotateCcw} />
        <StatCard label="Closed" value={stats?.closed} color="gray" Icon={CheckCircle2} />
        {(isAdminLevel || user?.role === 'user') && (
          <StatCard label="Declined Tickets" value={stats?.declined} color="red" Icon={XCircle} />
        )}
        {(user?.role === 'team_admin' || user?.role === 'team_user') && (
          <StatCard label="Transferred" value={stats?.transferred} color="red" Icon={XCircle} />
        )}
      </div>

      {(isAdminLevel || user?.role === 'team_admin' || user?.role === 'team_user') && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Urgent Priority', value: stats.urgent, color: '#f85149', Icon: AlertTriangle },
            { label: 'High Priority', value: stats.high, color: '#f85149', Icon: AlertTriangle },
            { label: 'Medium', value: stats.medium, color: '#d29922', Icon: Minus },
            { label: 'Low', value: stats.low, color: '#3fb950', Icon: Activity },
          ].map((p, i) => (
            <div key={i} className="card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p.Icon size={15} color={p.color} />
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{p.label}</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, color: p.color }}>{p.value || 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* Real-time stats panels */}
      {isAdminLevel && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 28 }}>
          
          {/* Simple Growth Chart */}
          <div className="chart-card">
            <div className="chart-title">Ticket Volume (30 Days)</div>
            <div className="chart-subtitle">Daily ticket creation rate</div>
            <div style={{ height: 200, marginTop: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={10} tickMargin={8} minTickGap={40} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" name="Tickets" stroke="var(--color-teal)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--color-teal)' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Simple Status Chart */}
          <div className="chart-card">
            <div className="chart-title">Status Breakdown</div>
            <div className="chart-subtitle">Current status breakdown</div>
            <div style={{ height: 200, marginTop: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" nameKey="name">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                  <Legend verticalAlign="bottom" height={32} iconType="circle" wrapperStyle={{ fontSize: 10, color: 'var(--color-text)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Real-time stats panels for Team Roles */}
      {(user?.role === 'team_admin' || user?.role === 'team_user') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 28 }}>
          
          {/* Status Chart */}
          <div className="chart-card">
            <div className="chart-title">Status Breakdown</div>
            <div className="chart-subtitle">Current ticket status distribution</div>
            <div style={{ height: 200, marginTop: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" nameKey="name">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                  <Legend verticalAlign="bottom" height={32} iconType="circle" wrapperStyle={{ fontSize: 10, color: 'var(--color-text)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Bar Chart */}
          <div className="chart-card">
            <div className="chart-title">Priority Distribution</div>
            <div className="chart-subtitle">Tickets by priority level</div>
            <div style={{ height: 200, marginTop: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {priorityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Team Admin Specific Section: Member Workload & Chart */}
      {user?.role === 'team_admin' && teamMembers.length > 0 && (
        <div style={{ marginTop: 28, marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Team Members & Agent Workload</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Team Members Workload Table */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Agent Workload & Status</div>
              <div className="table-wrap">
                <table style={{ cursor: 'default' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-card)' }}>
                      <th>Agent Name</th>
                      <th>Active</th>
                      <th>Resolved</th>
                      <th>Workload Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMembers.map((m) => {
                      const workloadStatus = m.activeCount >= 5 ? 'High' : m.activeCount >= 2 ? 'Medium' : 'Available';
                      const workloadColor = workloadStatus === 'High' ? 'var(--color-high)' : workloadStatus === 'Medium' ? 'var(--color-medium)' : 'var(--color-open)';
                      const workloadBg = workloadStatus === 'High' ? 'var(--color-high-bg)' : workloadStatus === 'Medium' ? 'var(--color-medium-bg)' : 'var(--color-open-bg)';
                      return (
                        <tr key={m._id} style={{ pointerEvents: 'none' }}>
                          <td>
                            <div style={{ fontWeight: 600, color: '#fff' }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{m.email}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--color-teal)' }}>{m.activeCount}</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{m.resolvedCount}</td>
                          <td>
                            <span className="badge" style={{ background: workloadBg, color: workloadColor, border: `1px solid ${workloadColor}30` }}>
                              {workloadStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalMemberPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    Page {memberPage} of {totalMemberPages}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      disabled={memberPage === 1}
                      onClick={() => setMemberPage(p => Math.max(1, p - 1))}
                    >
                      &larr; Prev
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      disabled={memberPage === totalMemberPages}
                      onClick={() => setMemberPage(p => Math.min(totalMemberPages, p + 1))}
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Team Members Workload Chart */}
            <div className="chart-card">
              <div className="chart-title">Agent Workload Chart</div>
              <div className="chart-subtitle">Active vs Resolved tickets per agent</div>
              <div style={{ height: 220, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamMembersChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                    <Legend verticalAlign="bottom" height={32} iconType="circle" wrapperStyle={{ fontSize: 10, color: 'var(--color-text)' }} />
                    <Bar dataKey="Active Tickets" fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Resolved Tickets" fill="var(--color-closed)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Tickets Table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent Tickets</h2>
        <Link to={user?.role === 'team_admin' ? '/team-admin/tickets' : user?.role === 'team_user' ? '/team-user/tickets' : '/tickets'} style={{ fontSize: 12, color: 'var(--color-teal)', display: 'flex', alignItems: 'center', gap: 4 }}>View all</Link>
      </div>

      {recent.length === 0 ? (
        <div className="card empty-state">
          <Ticket size={40} strokeWidth={1.5} />
          <h3>No tickets yet</h3>
          <p>{isAdminLevel ? 'No tickets have been raised.' : 'Create your first ticket to get started.'}</p>
          {!isAdminLevel && <Link to="/tickets/create" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}><Plus size={15} /> Create Ticket</Link>}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Hash size={11} /> ID</div></th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> Date</div></th>
                {isAdminLevel && <th><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} /> By</div></th>}
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t._id} onClick={() => navigate(`/tickets/${t._id}`)}>
                  <td style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: 12 }}>{t._id.slice(-6).toUpperCase()}</td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                  <td><StatusBadge status={t.approvalStatus === 'rejected' ? 'rejected' : t.status} /></td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                  {isAdminLevel && <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{t.user_id?.name}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
