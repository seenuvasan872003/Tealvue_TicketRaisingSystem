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
import API from '../services/authApi';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';

const COLORS = ['#eac253', '#3b82f6', '#22c55e', '#fb923c'];

const PerformanceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = useCallback(async () => {
    try {
      const params = { page, status: statusFilter };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await API.get(`/teams/${id}/performance`, { params });
      setData(res.data);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load team performance metrics');
    } finally {
      setLoading(false);
    }
  }, [id, page, statusFilter, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!data || !data.team) {
    return (
      <div className="page-body">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/teams')}>
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
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate('/admin/teams')}>
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      {/* ── 1. Team Header */}
      <div style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '24px 28px',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10,
            background: 'rgba(20,160,125,0.08)', border: '1px solid rgba(20,160,125,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-teal)'
          }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>{team.name}</h1>
              <span className={`badge ${team.isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10 }}>
                {team.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {team.categories?.map((c, idx) => (
                <span key={idx} style={{
                  fontSize: 9, padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.05)', color: '#ccc',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>{c}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#acacac' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={13} /> Admin: {team.teamAdmin?.name || 'Unassigned'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={13} /> Active Team Profile</div>
        </div>
      </div>

      {/* Team Admin Account Credentials Card */}
      {team.teamAdmin?.email && (
        <div style={{
          background: 'rgba(20,160,125,0.04)',
          border: '1px solid rgba(20,160,125,0.15)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: 13, color: 'var(--color-teal)', fontWeight: 600 }}>Team Admin Account Credentials</h4>
            <p style={{ margin: 0, fontSize: 11, color: '#acacac' }}>Use these credentials to log in as this Team's Admin. Copy and share them to hand over access.</p>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: '#acacac', display: 'block', fontSize: 11, marginBottom: 2 }}>Login Email</span>
              <strong style={{ color: '#fff', fontSize: 13 }}>{team.teamAdmin?.email}</strong>
            </div>
            <div>
              <span style={{ color: '#acacac', display: 'block', fontSize: 11, marginBottom: 2 }}>Login Password</span>
              <strong style={{ color: '#eac253', fontSize: 13, fontFamily: 'monospace' }}>{team.teamAdminPassword || 'password123'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Summary Stats & Performance Score Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        
        {/* Total handled */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, justifyContent: 'center' }}><Sliders size={20} /></div>
          <div>
            <div style={{ fontSize: 11, color: '#acacac', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tickets Handled</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 2 }}>{stats.total}</div>
          </div>
        </div>

        {/* Open */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(234,194,83,0.1)', color: '#eac253', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, justifyContent: 'center' }}><Clock size={20} /></div>
          <div>
            <div style={{ fontSize: 11, color: '#acacac', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Open Tickets</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 2 }}>{stats.open}</div>
          </div>
        </div>

        {/* In Progress */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(251,146,60,0.1)', color: '#fb923c', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, justifyContent: 'center' }}><AlertCircle size={20} /></div>
          <div>
            <div style={{ fontSize: 11, color: '#acacac', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Progress</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 2 }}>{stats.inProgress}</div>
          </div>
        </div>

        {/* Closed */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(34,197,94,0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, justifyContent: 'center' }}><CheckCircle size={20} /></div>
          <div>
            <div style={{ fontSize: 11, color: '#acacac', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closed Tickets</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 2 }}>{stats.closed}</div>
          </div>
        </div>

        {/* Performance Score */}
        <div style={{
          background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          borderColor: getScoreColor(stats.completionRate) + '40', background: `linear-gradient(to bottom, var(--color-card), ${getScoreColor(stats.completionRate)}05)`
        }}>
          <div style={{ fontSize: 11, color: '#acacac', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={11} /> Completion Rate</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: getScoreColor(stats.completionRate), marginTop: 4 }}>
            {stats.completionRate}%
          </div>
        </div>

      </div>

      {/* ── 3. Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
        
        {/* Weekly tickets received */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Weekly Tickets (Last 8 Weeks)</h3>
          <div style={{ width: '100%', height: 200 }}>
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
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Status Breakdown</h3>
          <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {statusPieData.length === 0 ? (
              <span style={{ color: '#555', fontSize: 12 }}>No ticket data available</span>
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
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Closed Tickets History (Last 6 Months)</h3>
          <div style={{ width: '100%', height: 200 }}>
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

      {/* ── 4. Ticket History Table */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        
        {/* Table Filters header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>Ticket Allocation History</h3>
          
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select
              className="select"
              style={{ padding: '4px 8px', fontSize: 12, width: 130 }}
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
              className="input"
              style={{ padding: '4px 8px', fontSize: 12, width: 135 }}
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              placeholder="Start Date"
            />
            <input
              type="date"
              className="input"
              style={{ padding: '4px 8px', fontSize: 12, width: 135 }}
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              placeholder="End Date"
            />

            {(statusFilter || startDate || endDate) && (
              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => { setStatusFilter(''); setStartDate(''); setEndDate(''); setPage(1); }}>
                Reset
              </button>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11 }}>#ID</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11 }}>Title</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11 }}>Category</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11 }}>Priority</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11 }}>Allocated</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: 30, textAlign: 'center', color: '#555' }}>
                    No tickets allocated to this team yet.
                  </td>
                </tr>
              ) : (
                tickets.map(t => (
                  <tr key={t._id} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                    <td style={{ padding: '13px 16px', color: '#555', fontFamily: 'monospace', fontSize: 11 }}>
                      #{t._id.slice(-6).toUpperCase()}
                    </td>
                    <td style={{ padding: '13px 16px', fontWeight: 500, color: '#e4e4e4' }}>{t.title}</td>
                    <td style={{ padding: '13px 16px', textTransform: 'capitalize', color: '#acacac' }}>{t.category}</td>
                    <td style={{ padding: '13px 16px' }}><PriorityBadge priority={t.priority} /></td>
                    <td style={{ padding: '13px 16px' }}><StatusBadge status={t.status} /></td>
                    <td style={{ padding: '13px 16px', color: '#acacac', fontSize: 11 }}>{formatDate(t.allocatedAt)}</td>
                    <td style={{ padding: '13px 16px' }}>
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
          <div className="pagination" style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', justifyContent: 'flex-end', margin: 0 }}>
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            <span style={{ fontSize: 12, color: '#acacac', padding: '0 8px' }}>Page {page} of {pages}</span>
            <button className="page-btn" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>›</button>
          </div>
        )}

      </div>

    </div>
  );
};

export default PerformanceDetails;
