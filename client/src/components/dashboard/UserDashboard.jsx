import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket, CircleDot, RotateCcw, CheckCircle2, XCircle, AlertTriangle, Plus, Hash, Calendar } from 'lucide-react';
import StatCard from './StatCard';
import FeedbackCard from '../FeedbackCard';
import StatusBadge, { PriorityBadge } from '../StatusBadge';

export default function UserDashboard({ user, stats, recent, pendingFeedback, setPendingFeedback, navigate, greeting }) {
  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]}</h1>
          <p className="page-subtitle">Track and manage your support tickets.</p>
        </div>
        <Link to="/tickets/create" className="btn btn-primary flex items-center gap-1">
          <Plus size={15} /> New Ticket
        </Link>
      </div>

      <div className="stat-grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <StatCard label="Total Tickets" value={stats?.total} color="teal" Icon={Ticket} />
        <StatCard label="Open" value={stats?.open} color="green" Icon={CircleDot} />
        <StatCard label="In Progress" value={stats?.inProgress} color="yellow" Icon={RotateCcw} />
        <StatCard label="Closed" value={stats?.closed} color="gray" Icon={CheckCircle2} />
        <StatCard label="Declined Tickets" value={stats?.declined} color="red" Icon={XCircle} />
        <StatCard label="Under Review" value={stats?.underReview} color="orange" Icon={AlertTriangle} />
      </div>

      {pendingFeedback.length > 0 && (
        <div className="space-y-3 mt-6">
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

      <div className="flex justify-between items-center mt-8 mb-4">
        <h2 className="text-[15px] font-semibold">Recent Tickets</h2>
        <Link to="/tickets/my" className="text-[12px] text-[var(--color-teal)] flex items-center gap-1">View all</Link>
      </div>

      {recent.length === 0 ? (
        <div className="card empty-state flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-xl text-center">
          <Ticket size={40} className="text-white/20 mb-3" />
          <h3 className="text-white font-medium mb-1">No tickets yet</h3>
          <p className="text-white/40 text-xs mb-4">Create your first ticket to get started.</p>
          <Link to="/tickets/create" className="btn btn-primary flex items-center gap-1">
            <Plus size={15} /> Create Ticket
          </Link>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
