import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, CircleDot, RotateCcw, CheckCircle2, XCircle, AlertTriangle, Minus, Activity, Hash, Calendar, User } from 'lucide-react';
import StatCard from './StatCard';
import StatusBadge, { PriorityBadge } from '../StatusBadge';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';

export default function TeamAdminDashboard({
  user, stats, recent, navigate, greeting, pieData, priorityChartData,
  teamMembers, teamMembersChartData, memberPage, setMemberPage, totalMemberPages, currentMembers
}) {
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowChart(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]}</h1>
          <p className="page-subtitle">Here's what's happening with team tickets today.</p>
        </div>
      </div>

      <div className="stat-grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <StatCard label="Total Tickets" value={stats?.total} color="teal" Icon={Ticket} />
        <StatCard label="Open" value={stats?.open} color="green" Icon={CircleDot} />
        <StatCard label="In Progress" value={stats?.inProgress} color="yellow" Icon={RotateCcw} />
        <StatCard label="Closed" value={stats?.closed} color="gray" Icon={CheckCircle2} />
        <StatCard label="Declined Tickets" value={stats?.declined} color="red" Icon={XCircle} />
        <StatCard label="Under Review" value={stats?.underReview} color="orange" Icon={AlertTriangle} />
        <StatCard label="Transferred" value={stats?.transferred} color="red" Icon={XCircle} />
      </div>

      {stats && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-7">
          {[
            { label: 'Urgent Priority', value: stats.urgent, color: '#f85149', Icon: AlertTriangle },
            { label: 'High Priority', value: stats.high, color: '#f85149', Icon: AlertTriangle },
            { label: 'Medium', value: stats.medium, color: '#d29922', Icon: Minus },
            { label: 'Low', value: stats.low, color: '#3fb950', Icon: Activity },
          ].map((p, i) => (
            <div key={i} className="card px-[18px] py-[14px] flex justify-between items-center bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-2">
                <p.Icon size={15} color={p.color} />
                <span className="text-[13px] text-[var(--color-text-muted)]">{p.label}</span>
              </div>
              <span className="text-[20px] font-bold" style={{ color: p.color }}>{p.value || 0}</span>
            </div>
          ))}
        </div>
      )}

      {showChart && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5 mb-7">
          {/* Status Chart */}
          <div className="chart-card p-5 bg-white/5 border border-white/10 rounded-xl">
            <div className="chart-title text-[14px] font-semibold mb-1">Status Breakdown</div>
            <div className="chart-subtitle text-xs text-white/40 mb-3">Current ticket status distribution</div>
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
          <div className="chart-card p-5 bg-white/5 border border-white/10 rounded-xl">
            <div className="chart-title text-[14px] font-semibold mb-1">Priority Distribution</div>
            <div className="chart-subtitle text-xs text-white/40 mb-3">Tickets by priority level</div>
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

      {/* Team Admin Workload & Status Table */}
      {teamMembers.length > 0 && (
        <div className="my-7">
          <h2 className="text-[15px] font-semibold mb-[14px]">Team Members & Agent Workload</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
            <div className="card p-5 bg-white/5 border border-white/10 rounded-xl">
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
            {showChart && (
              <div className="chart-card p-5 bg-white/5 border border-white/10 rounded-xl">
                <div className="chart-title text-[13px] font-semibold text-white mb-1">Agent Workload Chart</div>
                <div className="chart-subtitle text-xs text-white/40 mb-3">Active vs Resolved tickets per agent</div>
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
            )}
          </div>
        </div>
      )}

      {/* Recent Tickets Table */}
      <div className="flex justify-between items-center mb-4 mt-8">
        <h2 className="text-[15px] font-semibold">Recent Tickets</h2>
        <Link to="/team-admin/tickets" className="text-[12px] text-[var(--color-teal)] flex items-center gap-1">View all</Link>
      </div>

      {recent.length === 0 ? (
        <div className="card empty-state p-8 text-center border border-dashed border-white/10 rounded-xl text-white/40">
          No tickets found for your team.
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
                <th><div className="flex items-center gap-1"><User size={11} /> By</div></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t._id} onClick={() => navigate(`/tickets/${t._id}`)} className="cursor-pointer">
                  <td className="text-[var(--color-text-muted)] font-mono text-[12px]">{t._id.slice(-6).toUpperCase()}</td>
                  <td className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap">{t.title}</td>
                  <td><StatusBadge status={t.approvalStatus === 'suspended' ? 'suspended' : t.approvalStatus === 'rejected' ? 'rejected' : t.status} /></td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td className="text-[var(--color-text-muted)] text-[12px]">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="text-[var(--color-text-muted)] text-[12px]">{t.user_id?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
