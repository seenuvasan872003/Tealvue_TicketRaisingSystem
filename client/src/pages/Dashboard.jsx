// ============================================================
//  client/src/pages/Dashboard.jsx  —  Role-aware Dashboard (Controller)
// ============================================================

import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  getAdminStats, getMyStats, getTickets,
  getGrowthData, getStatusBreakdown,
  getMyTeam, getTeamMembers
} from '../services/ticketApi';
import { getCache, setCache } from '../utils/cache';
import logger from '../utils/logger';

// Lazy load role-specific dashboards to optimize main bundle size
const SuperAdminDashboard = lazy(() => import('../components/dashboard/SuperAdminDashboard'));
const AdminDashboard      = lazy(() => import('../components/dashboard/AdminDashboard'));
const TeamAdminDashboard  = lazy(() => import('../components/dashboard/TeamAdminDashboard'));
const TeamUserDashboard   = lazy(() => import('../components/dashboard/TeamUserDashboard'));
const UserDashboard       = lazy(() => import('../components/dashboard/UserDashboard'));

// Common Skeleton loader for rendering before child components mount
const DashboardSkeleton = () => (
  <div className="page-body fade-in">
    <div className="page-header flex justify-between mb-5">
      <div className="flex flex-col gap-2">
        <div className="skeleton-box w-[250px] h-7" />
        <div className="skeleton-box w-[380px] h-4" />
      </div>
    </div>
    <div className="stat-grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-5 flex flex-col gap-3 h-[100px] bg-white/5 border border-white/10 rounded-xl">
          <div className="flex justify-between">
            <div className="skeleton-box w-[80px] h-3.5" />
            <div className="skeleton-box w-5 h-5 rounded-full" />
          </div>
          <div className="skeleton-box w-[60px] h-8" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5 mb-7">
      <div className="card p-5 h-[280px] flex flex-col gap-3 bg-white/5 border border-white/10 rounded-xl">
        <div className="skeleton-box w-[180px] h-5" />
        <div className="skeleton-box w-[220px] h-3.5" />
        <div className="skeleton-box w-full flex-1 rounded mt-2" />
      </div>
      <div className="card p-5 h-[280px] flex flex-col gap-3 bg-white/5 border border-white/10 rounded-xl">
        <div className="skeleton-box w-[180px] h-5" />
        <div className="skeleton-box w-[220px] h-3.5" />
        <div className="skeleton-box w-full flex-1 rounded mt-2" />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { user, isAdminLevel } = useAuth();
  const navigate = useNavigate();

  const cacheKey = isAdminLevel ? 'dashboard_stats' : 'my_stats';

  const [stats, setStats] = useState(() => getCache(cacheKey));
  const [recent, setRecent] = useState(() => getCache('recent_tickets') || []);
  const [loading, setLoading] = useState(!stats);

  // Chart and Data states
  const [growthData, setGrowthData] = useState(() => getCache('dashboard_growth') || []);
  const [pieData, setPieData] = useState(() => getCache('dashboard_pie') || []);
  const [priorityChartData, setPriorityChartData] = useState(() => getCache('dashboard_priority') || []);
  const [teamMembers, setTeamMembers] = useState(() => getCache('dashboard_team_members') || []);
  const [teamMembersChartData, setTeamMembersChartData] = useState(() => getCache('dashboard_team_members_chart') || []);
  const [memberPage, setMemberPage] = useState(1);
  const membersPerPage = 4;

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

          const calculatedStats = { total, open, inProgress, closed, transferred, underReview, declined, urgent, high, medium, low };
          setStats(calculatedStats);
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

          setCache(cacheKey, calculatedStats, 5);
          setCache('recent_tickets', activeTickets.slice(0, 5), 3);
          setCache('dashboard_pie', newPie, 5);
          setCache('dashboard_priority', newPriority, 5);

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
      } catch (err) {
        console.error('[Dashboard] Non-critical charts load error:', err);
      }
    };

    const timer = setTimeout(loadNonCriticalCharts, 500);
    return () => clearTimeout(timer);
  }, [loading, isAdminLevel, user]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Sub-dashboard pagination parameters
  const indexOfLastMember = memberPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = teamMembers.slice(indexOfFirstMember, indexOfLastMember);
  const totalMemberPages = Math.ceil(teamMembers.length / membersPerPage) || 1;

  // Render correct sub-dashboard using lazy Suspense block
  return (
    <div className="page-body fade-in">
      <Suspense fallback={<DashboardSkeleton />}>
        {user?.role === 'super-admin' && (
          <SuperAdminDashboard
            user={user} stats={stats} recent={recent} navigate={navigate}
            greeting={greeting} pieData={pieData} priorityChartData={priorityChartData} growthData={growthData}
          />
        )}
        {user?.role === 'admin' && (
          <AdminDashboard
            user={user} stats={stats} recent={recent} navigate={navigate}
            greeting={greeting} pieData={pieData} priorityChartData={priorityChartData} growthData={growthData}
          />
        )}
        {user?.role === 'team_admin' && (
          <TeamAdminDashboard
            user={user} stats={stats} recent={recent} navigate={navigate}
            greeting={greeting} pieData={pieData} priorityChartData={priorityChartData}
            teamMembers={teamMembers} teamMembersChartData={teamMembersChartData}
            memberPage={memberPage} setMemberPage={setMemberPage} totalMemberPages={totalMemberPages}
            currentMembers={currentMembers}
          />
        )}
        {user?.role === 'team_user' && (
          <TeamUserDashboard
            user={user} stats={stats} recent={recent} navigate={navigate}
            greeting={greeting} pieData={pieData} priorityChartData={priorityChartData}
          />
        )}
        {user?.role === 'user' && (
          <UserDashboard
            user={user} stats={stats} recent={recent}
            pendingFeedback={pendingFeedback} setPendingFeedback={setPendingFeedback}
            navigate={navigate} greeting={greeting}
          />
        )}
      </Suspense>
    </div>
  );
}
