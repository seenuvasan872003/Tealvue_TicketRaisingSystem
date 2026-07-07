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
import axios from 'axios';
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
import logger from '../utils/logger';
import FeedbackCard from '../components/FeedbackCard';

const StatCard = ({ label, value, color, Icon }) => {
  // Map color to a modern gradient background
  const colorsMap = {
    teal: { bg: 'linear-gradient(135deg, rgba(20,160,125,0.06) 0%, rgba(20,160,125,0.02) 100%)', border: 'rgba(20,160,125,0.3)', text: 'var(--color-teal)' },
    green: { bg: 'linear-gradient(135deg, rgba(63,185,80,0.06) 0%, rgba(63,185,80,0.02) 100%)', border: 'rgba(63,185,80,0.3)', text: 'var(--color-open)' },
    yellow: { bg: 'linear-gradient(135deg, rgba(210,153,34,0.06) 0%, rgba(210,153,34,0.02) 100%)', border: 'rgba(210,153,34,0.3)', text: 'var(--color-progress)' },
    gray: { bg: 'linear-gradient(135deg, rgba(110,118,129,0.06) 0%, rgba(110,118,129,0.02) 100%)', border: 'rgba(110,118,129,0.3)', text: 'var(--color-closed)' },
    red: { bg: 'linear-gradient(135deg, rgba(248,81,73,0.06) 0%, rgba(248,81,73,0.02) 100%)', border: 'rgba(248,81,73,0.3)', text: 'var(--color-high)' },
    orange: { bg: 'linear-gradient(135deg, rgba(251,146,60,0.06) 0%, rgba(251,146,60,0.02) 100%)', border: 'rgba(251,146,60,0.3)', text: '#fb923c' },
  };

  const styleSet = colorsMap[color] || colorsMap.teal;

  return (
    <div 
      className="card px-6 py-5 rounded-xl transition-all duration-200 flex flex-col justify-between gap-3" 
      style={{ 
        background: styleSet.bg, 
        border: `1px solid ${styleSet.border}`
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 8px 24px ${styleSet.border}20`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
          {label}
        </span>
        <Icon size={18} className="opacity-80" style={{ color: styleSet.text }} />
      </div>
      <div className="text-[28px] font-extrabold text-white leading-[1.1]">
        {value ?? 0}
      </div>
    </div>
  );
};

import { getCache, setCache } from '../utils/cache';

const Dashboard = () => {
  const { user, isAdminLevel } = useAuth();
  const navigate = useNavigate();

  const cacheKey = isAdminLevel ? 'dashboard_stats' : 'my_stats';

  const [stats, setStats] = useState(() => getCache(cacheKey));
  const [recent, setRecent] = useState(() => getCache('recent_tickets') || []);
  const [loading, setLoading] = useState(!stats);

  // Chart Data State
  const [growthData, setGrowthData] = useState(() => getCache('dashboard_growth') || []);
  const [pieData, setPieData] = useState(() => getCache('dashboard_pie') || []);
  const [priorityChartData, setPriorityChartData] = useState(() => getCache('dashboard_priority') || []);
  const [teamMembers, setTeamMembers] = useState(() => getCache('dashboard_team_members') || []);
  const [teamMembersChartData, setTeamMembersChartData] = useState(() => getCache('dashboard_team_members_chart') || []);
  const [memberPage, setMemberPage] = useState(1);
  const membersPerPage = 4;

  const [chartsLoaded, setChartsLoaded] = useState(() => !!getCache('dashboard_growth'));
  const [pendingFeedback, setPendingFeedback] = useState([]);

  useEffect(() => {
    const loadCriticalData = async () => {
      logger.info('Dashboard', 'loadCriticalData', `Loading critical dashboard data for role: ${user?.role}`, { action: 'Dashboard Critical Load Start' });
      try {
        if (user?.role === 'team_admin' || user?.role === 'team_user') {
          const [ticketsRes, teamRes] = await Promise.all([
            getTickets({ page: 1, limit: 1000 }),
            getMyTeam().catch(() => ({ data: null }))
          ]);
          const ticketsList = ticketsRes.data.tickets || [];
          const myTeam = teamRes?.data;
          const myTeamId = myTeam?._id;

          // Filter to only include tickets that actively belong to this team
          const activeTickets = ticketsList.filter(t => {
            const tTeamId = t.teamId?._id || t.teamId;
            const tReallocatedFrom = t.reallocatedFromTeamId?._id || t.reallocatedFromTeamId;
            
            if (t.allocationStatus === 'transferred_to_admin') return false;
            if (myTeamId && tReallocatedFrom === myTeamId && tTeamId !== myTeamId) return false;
            return myTeamId ? tTeamId === myTeamId : true;
          });
          
          const total = ticketsList.length;
          const open = activeTickets.filter(t => t.status === 'open' && t.approvalStatus !== 'suspended' && t.approvalStatus !== 'rejected').length;
          const inProgress = activeTickets.filter(t => t.status === 'in-progress' && t.approvalStatus !== 'suspended' && t.approvalStatus !== 'rejected').length;
          const closed = activeTickets.filter(t => t.status === 'closed' && t.approvalStatus !== 'suspended' && t.approvalStatus !== 'rejected').length;
          const transferred = total - activeTickets.length;
          const underReview = activeTickets.filter(t => t.approvalStatus === 'suspended').length;
          const declined = activeTickets.filter(t => t.approvalStatus === 'rejected').length;
          
          const urgent = activeTickets.filter(t => t.priority === 'urgent' && t.approvalStatus !== 'suspended' && t.approvalStatus !== 'rejected').length;
          const high = activeTickets.filter(t => t.priority === 'high' && t.approvalStatus !== 'suspended' && t.approvalStatus !== 'rejected').length;
          const medium = activeTickets.filter(t => t.priority === 'medium' && t.approvalStatus !== 'suspended' && t.approvalStatus !== 'rejected').length;
          const low = activeTickets.filter(t => t.priority === 'low' && t.approvalStatus !== 'suspended' && t.approvalStatus !== 'rejected').length;

           setStats({ total, open, inProgress, closed, transferred, underReview, declined, urgent, high, medium, low });
          setRecent(activeTickets.slice(0, 5));

          const newPie = [
            { name: 'Open', value: open, color: '#3fb950' },
            { name: 'In Progress', value: inProgress, color: '#d29922' },
            { name: 'Closed', value: closed, color: '#6e7681' },
            { name: 'Under Review', value: underReview, color: '#fb923c' },
            { name: 'Declined', value: declined, color: '#f85149' },
          ].filter(x => x.value > 0);
          setPieData(newPie);

          const newPriority = [
            { name: 'Low', value: low, color: '#3fb950' },
            { name: 'Medium', value: medium, color: '#d29922' },
            { name: 'High', value: high, color: '#f85149' },
            { name: 'Urgent', value: urgent, color: '#f85149' },
          ];
          setPriorityChartData(newPriority);

          setCache(cacheKey, { total, open, inProgress, closed, transferred, underReview, declined, urgent, high, medium, low }, 5);
          setCache('recent_tickets', activeTickets.slice(0, 5), 3);
          setCache('dashboard_pie', newPie, 5);
          setCache('dashboard_priority', newPriority, 5);

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
              const newTeamMembersChart = membersWithStats.map(m => ({
                name: m.name,
                'Active Tickets': m.activeCount,
                'Resolved Tickets': m.resolvedCount,
              }));
              setTeamMembersChartData(newTeamMembersChart);

              setCache('dashboard_team_members', membersWithStats, 10);
              setCache('dashboard_team_members_chart', newTeamMembersChart, 10);
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
          setCache(cacheKey, statsRes.data, 5);
          setCache('recent_tickets', ticketsRes.data.tickets, 3);
        }

        // Load pending feedback for regular users
        if (user?.role === 'user') {
          try {
            const BASE_USER = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/user`;
            const token = localStorage.getItem('token');
            const fbRes = await axios.get(`${BASE_USER}/tickets/my/feedback/pending`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setPendingFeedback(fbRes.data.tickets || []);
          } catch (_) {}
        }
      } catch (e) {
        console.error('[Dashboard] load error:', e);
      } finally {
        setLoading(false);
      }
    };
    loadCriticalData();
  }, [isAdminLevel, user, cacheKey]);

  useEffect(() => {
    if (loading || !isAdminLevel || user?.role === 'team_admin' || user?.role === 'team_user') return;

    const loadNonCriticalCharts = async () => {
      try {
        const [gRes, pRes] = await Promise.all([
          getGrowthData(), getStatusBreakdown()
        ]);
        setGrowthData(gRes.data);
        setCache('dashboard_growth', gRes.data, 5);
        
        const rawPie = pRes.data || [];
        const newPieData = [
          { name: 'Open', value: rawPie.find(x => x.status === 'open' || x._id === 'open')?.count || 0, color: '#3fb950' },
          { name: 'In Progress', value: rawPie.find(x => x.status === 'in-progress' || x._id === 'in-progress')?.count || 0, color: '#d29922' },
          { name: 'Closed', value: rawPie.find(x => x.status === 'closed' || x._id === 'closed')?.count || 0, color: '#6e7681' },
          { name: 'Declined', value: rawPie.find(x => x.status === 'declined' || x._id === 'declined')?.count || 0, color: '#f85149' },
          { name: 'Under Review', value: rawPie.find(x => x.status === 'suspended' || x._id === 'suspended')?.count || 0, color: '#fb923c' },
        ].filter(x => x.value > 0);
        setPieData(newPieData);
        setCache('dashboard_pie', newPieData, 5);
        
        setChartsLoaded(true);
      } catch (err) {
        console.error('[Dashboard] Non-critical charts load error:', err);
      }
    };

    // Delay chart api calls slightly to give main thread breathing room
    const timer = setTimeout(loadNonCriticalCharts, 500);
    return () => clearTimeout(timer);
  }, [loading, isAdminLevel, user]);

  if (loading) {
    return (
      <div className="page-body fade-in">
        <div className="page-header flex justify-between mb-5">
          <div className="flex flex-col gap-2">
            <div className="skeleton-box w-[250px] h-7" />
            <div className="skeleton-box w-[380px] h-4" />
          </div>
        </div>
        <div className="stat-grid mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 flex flex-col gap-3 h-[100px]">
              <div className="flex justify-between">
                <div className="skeleton-box w-[80px] h-3.5" />
                <div className="skeleton-box w-5 h-5 rounded-full" />
              </div>
              <div className="skeleton-box w-[60px] h-8" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5 mb-7">
          <div className="card p-5 h-[280px] flex flex-col gap-3">
            <div className="skeleton-box w-[180px] h-5" />
            <div className="skeleton-box w-[220px] h-3.5" />
            <div className="skeleton-box w-full flex-1 rounded mt-2" />
          </div>
          <div className="card p-5 h-[280px] flex flex-col gap-3">
            <div className="skeleton-box w-[180px] h-5" />
            <div className="skeleton-box w-[220px] h-3.5" />
            <div className="skeleton-box w-full flex-1 rounded mt-2" />
          </div>
        </div>
      </div>
    );
  }

  // Sliced team members for pagination (3-4 users, others are slider/paginated)
  const indexOfLastMember = memberPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = teamMembers.slice(indexOfFirstMember, indexOfLastMember);
  const totalMemberPages = Math.ceil(teamMembers.length / membersPerPage) || 1;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Customize layout depending on role (Admins and standard users get Declined + Under Review)
  const isTeamStaff = user?.role === 'team_admin' || user?.role === 'team_user';

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

      <div className="stat-grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        <StatCard label="Total Tickets" value={stats?.total} color="teal" Icon={Ticket} />
        <StatCard label="Open" value={stats?.open} color="green" Icon={CircleDot} />
        <StatCard label="In Progress" value={stats?.inProgress} color="yellow" Icon={RotateCcw} />
        <StatCard label="Closed" value={stats?.closed} color="gray" Icon={CheckCircle2} />
        <StatCard label="Declined Tickets" value={stats?.declined} color="red" Icon={XCircle} />
        <StatCard label="Under Review" value={stats?.underReview} color="orange" Icon={AlertTriangle} />
        {isTeamStaff && (
          <StatCard label="Transferred" value={stats?.transferred} color="red" Icon={XCircle} />
        )}
      </div>

      {/* Pending Feedback Cards */}
      {pendingFeedback.length > 0 && (
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
            <span>⭐</span> Awaiting Your Feedback
          </h3>
          {pendingFeedback.map(ticket => (
            <FeedbackCard
              key={ticket._id}
              ticket={ticket}
              onDone={() => setPendingFeedback(prev => prev.filter(t => t._id !== ticket._id))}
            />
          ))}
        </div>
      )}

      {(isAdminLevel || user?.role === 'team_admin' || user?.role === 'team_user') && stats && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-7">
          {[
            { label: 'Urgent Priority', value: stats.urgent, color: '#f85149', Icon: AlertTriangle },
            { label: 'High Priority', value: stats.high, color: '#f85149', Icon: AlertTriangle },
            { label: 'Medium', value: stats.medium, color: '#d29922', Icon: Minus },
            { label: 'Low', value: stats.low, color: '#3fb950', Icon: Activity },
          ].map((p, i) => (
            <div key={i} className="card px-[18px] py-[14px] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <p.Icon size={15} color={p.color} />
                <span className="text-[13px] text-[var(--color-text-muted)]">{p.label}</span>
              </div>
              <span className="text-[20px] font-bold" style={{ color: p.color }}>{p.value || 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* Real-time stats panels */}
      {isAdminLevel && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5 mb-7">
          
          {/* Simple Growth Chart */}
          <div className="chart-card">
            <div className="chart-title">Ticket Volume (30 Days)</div>
            <div className="chart-subtitle">Daily ticket creation rate</div>
            <div className="h-[200px] mt-3">
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
            <div className="h-[200px] mt-3">
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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5 mb-7">
          
          {/* Status Chart */}
          <div className="chart-card">
            <div className="chart-title">Status Breakdown</div>
            <div className="chart-subtitle">Current ticket status distribution</div>
            <div className="h-[200px] mt-3">
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
            <div className="h-[200px] mt-3">
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
        <div className="my-7">
          <h2 className="text-[15px] font-semibold mb-[14px]">Team Members & Agent Workload</h2>
          
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
            {/* Team Members Workload Table */}
            <div className="card p-5">
              <div className="text-[13px] font-semibold text-[var(--color-text)] mb-3">Agent Workload & Status</div>
              <div className="table-wrap">
                <table className="cursor-default">
                  <thead>
                    <tr className="bg-[var(--color-card)]">
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
                        <tr key={m._id} className="pointer-events-none">
                          <td>
                            <div className="font-semibold text-white">{m.name}</div>
                            <div className="text-[11px] text-[var(--color-text-muted)]">{m.email}</div>
                          </td>
                          <td className="font-bold text-[var(--color-teal)]">{m.activeCount}</td>
                          <td className="text-[var(--color-text-muted)]">{m.resolvedCount}</td>
                          <td>
                            <span className="badge border border-solid" style={{ background: workloadBg, color: workloadColor, borderColor: `${workloadColor}30` }}>
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
                <div className="flex justify-between items-center mt-[14px] pt-3 border-t border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    Page {memberPage} of {totalMemberPages}
                  </span>
                  <div className="flex gap-[6px]">
                    <button
                      className="btn btn-ghost px-[10px] py-1 text-[11px]"
                      disabled={memberPage === 1}
                      onClick={() => setMemberPage(p => Math.max(1, p - 1))}
                    >
                      &larr; Prev
                    </button>
                    <button
                      className="btn btn-ghost px-[10px] py-1 text-[11px]"
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
              <div className="h-[220px] mt-3">
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
      <div className="flex justify-between items-center mb-[14px]">
        <h2 className="text-[15px] font-semibold">Recent Tickets</h2>
        <Link to={user?.role === 'super-admin' ? '/super-admin/tickets' : user?.role === 'admin' ? '/admin/tickets' : user?.role === 'team_admin' ? '/team-admin/tickets' : user?.role === 'team_user' ? '/team-user/assigned-tickets' : '/tickets/my'} className="text-[12px] text-[var(--color-teal)] flex items-center gap-1">View all</Link>
      </div>

      {recent.length === 0 ? (
        <div className="card empty-state">
          <Ticket size={40} strokeWidth={1.5} />
          <h3>No tickets yet</h3>
          <p>{isAdminLevel ? 'No tickets have been raised.' : 'Create your first ticket to get started.'}</p>
          {!isAdminLevel && <Link to="/tickets/create" className="btn btn-primary mt-4 inline-flex"><Plus size={15} /> Create Ticket</Link>}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><div className="flex items-center gap-1"><Hash size={11} /> ID</div></th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th><div className="flex items-center gap-1"><Calendar size={11} /> Date</div></th>
                {isAdminLevel && <th><div className="flex items-center gap-1"><User size={11} /> By</div></th>}
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t._id} onClick={() => navigate(`/tickets/${t._id}`)}>
                  <td className="text-[var(--color-text-muted)] font-mono text-[12px]">{t._id.slice(-6).toUpperCase()}</td>
                  <td className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap">{t.title}</td>
                  <td><StatusBadge status={t.approvalStatus === 'suspended' ? 'suspended' : t.approvalStatus === 'rejected' ? 'rejected' : t.status} /></td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td className="text-[var(--color-text-muted)] text-[12px]">{new Date(t.createdAt).toLocaleDateString()}</td>
                  {isAdminLevel && <td className="text-[var(--color-text-muted)] text-[12px]">{t.user_id?.name}</td>}
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
