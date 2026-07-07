// ============================================================
//  client/src/pages/PerformanceDetails.jsx
// ============================================================
//  Accessible by: Admin & Super Admin ONLY
//  Displays dynamic charts and history table for a specific team.
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Mail, Calendar, Sliders,
  CheckCircle, Clock, AlertCircle, TrendingUp
} from 'lucide-react';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import { toast } from 'react-toastify';
import axios from 'axios';
import API from '../services/authApi';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import ExportButton from '../components/ExportButton';
import logger from '../utils/logger';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#eac253', '#3b82f6', '#22c55e', '#fb923c'];

const PerformanceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const teamId = id;
  const rolePrefix = user?.role === 'super-admin' ? 'super-admin' : 'admin';
  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const dashboardPath = user?.role === 'super-admin' ? '/super-admin/team-dashboard' : '/admin/team-dashboard';
  
  const [data, setData] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = useCallback(async () => {
    logger.info('PerformanceDetails', 'loadData', `Loading performance metrics for team: ${id}`, { api: `/api/teams/${id}/performance`, method: 'GET', action: 'Performance Details Load Start' });
    try {
      const params = { page, status: statusFilter };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await API.get(`/teams/${id}/performance`, { params });
      setData(res.data);
      setTeamData(res.data?.team || null);
      setPages(res.data.pages || 1);
      logger.info('PerformanceDetails', 'loadData', `Performance data loaded for team: ${id}`, { api: `/api/teams/${id}/performance`, method: 'GET', status: 200, action: 'Performance Details Load Success' });
    } catch (err) {
      logger.error('PerformanceDetails', 'loadData', 'Failed to load performance metrics', err, { api: `/api/teams/${id}/performance`, method: 'GET', action: 'Performance Details Load Failure' });
      console.error(err);
      toast.error('Failed to load team performance metrics');
    } finally {
      setLoading(false);
    }

    // Load feedback data
    if (id) {
      try {
        const fbRes = await API.get(`/${rolePrefix}/feedback/team/${id}`);
        setFeedbacks(fbRes.data.feedbacks || []);
        if (fbRes.data.team) setTeamData(prev => ({ ...prev, ...fbRes.data.team }));
      } catch (err) {
        console.error('Failed to load feedback:', err);
      }
    }
  }, [id, page, statusFilter, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex justify-center p-[100px]">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!data || !data.team) {
    return (
      <div className="page-body">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(dashboardPath)}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="empty-state">
          <Users size={48} />
          <h3>Team Not Found</h3>
        </div>
      </div>
    );
  }

  const { team, stats, weeklyData, monthlyClosedData, tickets = [] } = data;
  const resolvedTeamData = teamData || team;

  // Performance Score Color
  const getScoreColor = (rate) => {
    if (rate >= 75) return '#86efac';
    if (rate >= 40) return '#eac253';
    return '#f87171';
  };

  // Pie chart status distribution data
  const statusPieData = [
    { name: 'Open', value: stats.open },
    { name: 'In Progress', value: stats.inProgress },
    { name: 'Closed', value: stats.closed }
  ].filter(d => d.value > 0);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="page-body fade-in">
      
      {/* Back navigation */}
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate(dashboardPath)}>
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      {/* ── 1. Team Header */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl py-6 px-7 mb-5 flex justify-between items-start flex-wrap gap-5">
        <div className="flex gap-4 items-start">
          <div className="w-12 h-12 rounded-[10px] bg-[rgba(20,160,125,0.08)] border border-[rgba(20,160,125,0.18)] flex items-center justify-center text-[var(--color-teal)]">
            <Users size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold m-0 text-white">{team.name}</h1>
              <span className={`badge ${team.isActive ? 'badge-success' : 'badge-danger'} text-[10px]`}>
                {team.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap mt-2">
              {team.categories?.map((c, idx) => (
                <span key={idx} className="text-[9px] py-0.5 px-2 rounded-[20px] bg-[rgba(255,255,255,0.05)] text-[#ccc] border border-[rgba(255,255,255,0.08)]">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-[13px] text-[#acacac]">
          <div className="flex items-center gap-1.5"><Mail size={13} /> Admin: {team.teamAdmin?.name || 'Unassigned'}</div>
          <div className="flex items-center gap-1.5"><Calendar size={13} /> Active Team Profile</div>
        </div>
      </div>

      {/* Team Admin Account Credentials Card */}
      {team.teamAdmin?.email && (
        <div className="bg-[rgba(20,160,125,0.04)] border border-[rgba(20,160,125,0.15)] rounded-xl py-4 px-5 mb-5 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h4 className="m-0 mb-1 text-[13px] text-[var(--color-teal)] font-semibold">Team Admin Account Credentials</h4>
            <p className="m-0 text-[11px] text-[#acacac]">Use these credentials to log in as this Team's Admin. Copy and share them to hand over access.</p>
          </div>
          <div className="flex gap-6 flex-wrap">
            <div>
              <span className="text-[#acacac] block text-[11px] mb-0.5">Login Email</span>
              <strong className="text-white text-[13px]">{team.teamAdmin?.email}</strong>
            </div>
            <div>
              <span className="text-[#acacac] block text-[11px] mb-0.5">Login Password</span>
              <strong className="text-[#eac253] text-[13px] font-mono">{team.teamAdminPassword || 'password123'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Summary Stats & Performance Score Row */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-5">
        
        {/* Total handled */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5 flex items-center gap-[14px]">
          <div className="w-10 h-10 rounded-lg bg-[rgba(59,130,246,0.1)] text-[#3b82f6] flex items-center justify-center shrink-0"><Sliders size={20} /></div>
          <div>
            <div className="text-[11px] text-[#acacac] uppercase tracking-[0.05em]">Tickets Handled</div>
            <div className="text-[22px] font-bold text-white mt-0.5">{stats.total}</div>
          </div>
        </div>

        {/* Open */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5 flex items-center gap-[14px]">
          <div className="w-10 h-10 rounded-lg bg-[rgba(234,194,83,0.1)] text-[#eac253] flex items-center justify-center shrink-0"><Clock size={20} /></div>
          <div>
            <div className="text-[11px] text-[#acacac] uppercase tracking-[0.05em]">Open Tickets</div>
            <div className="text-[22px] font-bold text-white mt-0.5">{stats.open}</div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5 flex items-center gap-[14px]">
          <div className="w-10 h-10 rounded-lg bg-[rgba(251,146,60,0.1)] text-[#fb923c] flex items-center justify-center shrink-0"><AlertCircle size={20} /></div>
          <div>
            <div className="text-[11px] text-[#acacac] uppercase tracking-[0.05em]">In Progress</div>
            <div className="text-[22px] font-bold text-white mt-0.5">{stats.inProgress}</div>
          </div>
        </div>

        {/* Closed */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5 flex items-center gap-[14px]">
          <div className="w-10 h-10 rounded-lg bg-[rgba(34,197,94,0.1)] text-[#22c55e] flex items-center justify-center shrink-0"><CheckCircle size={20} /></div>
          <div>
            <div className="text-[11px] text-[#acacac] uppercase tracking-[0.05em]">Closed Tickets</div>
            <div className="text-[22px] font-bold text-white mt-0.5">{stats.closed}</div>
          </div>
        </div>

        {/* Performance Score */}
        <div 
          className="border rounded-xl p-5 flex flex-col justify-center items-center"
          style={{ borderColor: getScoreColor(stats.completionRate) + '40', background: `linear-gradient(to bottom, var(--color-card), ${getScoreColor(stats.completionRate)}05)` }}
        >
          <div className="text-[11px] text-[#acacac] uppercase tracking-[0.05em] flex items-center gap-1"><TrendingUp size={11} /> Completion Rate</div>
          <div className="text-[32px] font-extrabold mt-1" style={{ color: getScoreColor(stats.completionRate) }}>
            {stats.completionRate}%
          </div>
        </div>

      </div>

      {/* ── 3. Tab Navigation */}
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-5">
        {['overview', 'tickets', 'feedback'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 bg-transparent border-none font-semibold cursor-pointer text-sm capitalize ${
              activeTab === tab
                ? 'border-b-2 border-[var(--color-teal)] text-[var(--color-teal)]'
                : 'border-b-2 border-transparent text-[#acacac]'
            }`}
          >
            {tab === 'tickets' ? 'Ticket History' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
      {/* ── 4. Charts Section */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5 mb-5">
        
        {/* Weekly tickets received */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-white mb-4">Weekly Tickets (Last 8 Weeks)</h3>
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                <XAxis dataKey="week" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#181818', border: '1px solid #333', borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="count" fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-white mb-4">Status Breakdown</h3>
          <div className="w-full h-[200px] flex items-center justify-center">
            {statusPieData.length === 0 ? (
              <span className="text-[#555] text-xs">No ticket data available</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#181818', border: '1px solid #333', borderRadius: 6, fontSize: 11 }} />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Cumulative tickets closed */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-white mb-4">Closed Tickets History (Last 6 Months)</h3>
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyClosedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                <XAxis dataKey="month" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#181818', border: '1px solid #333', borderRadius: 6, fontSize: 11 }} />
                <Line type="monotone" dataKey="closed" stroke="#22c55e" strokeWidth={2} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

        </>
      )}

      {activeTab === 'tickets' && (

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        
        {/* Table Filters header */}
        <div className="py-4 px-5 border-b border-[var(--color-border)] flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <h3 className="text-sm font-semibold text-white m-0">Ticket Allocation History</h3>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <select
              className="select py-1 px-2 text-xs w-full sm:w-[130px]"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>

            <input
              type="date"
              className="input py-1 px-2 text-xs w-full sm:w-[135px]"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              placeholder="Start Date"
            />
            <input
              type="date"
              className="input py-1 px-2 text-xs w-full sm:w-[135px]"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              placeholder="End Date"
            />

            {(statusFilter || startDate || endDate) && (
              <button className="btn btn-ghost btn-sm py-1 px-2 text-[11px] w-full sm:w-auto" onClick={() => { setStatusFilter(''); setStartDate(''); setEndDate(''); setPage(1); }}>
                Reset
              </button>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="table-wrap">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-border)]">
                <th className="py-3 px-4 text-left text-[#acacac] font-semibold text-[11px]">#ID</th>
                <th className="py-3 px-4 text-left text-[#acacac] font-semibold text-[11px]">Title</th>
                <th className="py-3 px-4 text-left text-[#acacac] font-semibold text-[11px]">Category</th>
                <th className="py-3 px-4 text-left text-[#acacac] font-semibold text-[11px]">Priority</th>
                <th className="py-3 px-4 text-left text-[#acacac] font-semibold text-[11px]">Status</th>
                <th className="py-3 px-4 text-left text-[#acacac] font-semibold text-[11px]">Allocated</th>
                <th className="py-3 px-4 text-left text-[#acacac] font-semibold text-[11px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-[30px] text-center text-[#555]">
                    No tickets allocated to this team yet.
                  </td>
                </tr>
              ) : (
                tickets.map(t => (
                  <tr
                    key={t._id}
                    onClick={() => navigate(`/tickets/${t._id}`)}
                    className="border-b border-[var(--color-border-soft)] cursor-pointer transition-colors duration-150 hover:bg-[rgba(255,255,255,0.03)]"
                  >
                    <td className="py-[13px] px-4 text-[#555] font-mono text-[11px]">
                      #{t._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-[13px] px-4 font-medium text-[#e4e4e4]">{t.title}</td>
                    <td className="py-[13px] px-4 capitalize text-[#acacac]">{t.category}</td>
                    <td className="py-[13px] px-4" onClick={(e) => e.stopPropagation()}><PriorityBadge priority={t.priority} /></td>
                    <td className="py-[13px] px-4" onClick={(e) => e.stopPropagation()}><StatusBadge status={t.status} /></td>
                    <td className="py-[13px] px-4 text-[#acacac] text-[11px]">{formatDate(t.allocatedAt)}</td>
                    <td className="py-[13px] px-4" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tickets/${t._id}`)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="pagination py-3 px-5 border-t border-[var(--color-border)] justify-end m-0">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            <span className="text-xs text-[#acacac] px-2">Page {page} of {pages}</span>
            <button className="page-btn" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>›</button>
          </div>
        )}

      </div>

      )}

      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* Average Rating */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-5xl font-bold text-yellow-400">{resolvedTeamData?.averageRating?.toFixed(1) || '\u2014'}</p>
                <div className="flex justify-center gap-0.5 mt-1">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} style={{ color: s <= Math.round(resolvedTeamData?.averageRating || 0) ? '#eac253' : '#3a3a3a' }}>&#9733;</span>
                  ))}
                </div>
                <p className="text-xs text-white/40 mt-1">Average Rating</p>
              </div>
              <div className="ml-8">
                <p className="text-2xl font-bold text-white">{resolvedTeamData?.totalFeedbacks || 0}</p>
                <p className="text-xs text-white/40">Total Feedbacks</p>
              </div>
            </div>

            {/* Star Breakdown */}
            <div className="mt-6 space-y-2">
              {['five','four','three','two','one'].map((key, i) => {
                const stars = 5 - i;
                const count = resolvedTeamData?.ratingBreakdown?.[key] || 0;
                const total = resolvedTeamData?.totalFeedbacks || 1;
                const pct   = Math.round((count / total) * 100);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-white/50 w-8 text-right">{stars}&#9733;</span>
                    <div className="flex-1 bg-white/5 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-yellow-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/50 w-10">{pct}%</span>
                    <span className="text-xs text-white/30 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Comments */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-white/70">Recent Feedback Comments</h4>
              <ExportButton
                endpoint={`/api/${rolePrefix}/export/feedback`}
                filename="feedback"
                filters={{ teamId: teamId }}
                label="Export Feedback"
              />
            </div>
            {feedbacks.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-8">No feedback yet</p>
            ) : feedbacks.map(fb => (
              <div key={fb._id} className="border-b border-white/5 py-4 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-sm font-semibold text-white/90">{fb.userId?.name || 'Anonymous'}</div>
                  <div className="text-xs text-white/60 leading-relaxed">{fb.comment || <em className="text-white/20">No comment</em>}</div>
                  {fb.teamUserId && (
                    <div className="text-[11px] text-teal-400 font-semibold mt-1">Solved by: {fb.teamUserId.name}</div>
                  )}
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">{fb.rating}★</span>
                  <span className="text-[10px] text-white/30">{new Date(fb.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default PerformanceDetails;
