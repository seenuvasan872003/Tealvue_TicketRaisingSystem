import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUserActivity } from '../services/userApi';
import { getTicketLogs } from '../services/ticketApi';
import { 
  ArrowLeft, User, Mail, Shield, CheckCircle, XCircle, 
  FileText, History, BarChart3, Clock, ChevronDown, ChevronUp,
  Plus, Target, RefreshCw, Calendar, AlertTriangle, Play,
  UserCheck, Unlock, CheckCircle2, MessageSquare, Flag, Cpu, ShieldAlert, ShieldX
} from 'lucide-react';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import { toast } from 'react-toastify';

const ACTION_ICONS = {
  TICKET_CREATED: { Icon: Plus, color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  TICKET_AUTO_ALLOCATED_TEAM: { Icon: Cpu, color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' },
  TICKET_MANUALLY_ALLOCATED_TEAM: { Icon: Target, color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  TICKET_REALLOCATED_TEAM: { Icon: RefreshCw, color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  PRIORITY_CHANGED: { Icon: ShieldAlert, color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  DUE_DATE_SET: { Icon: Calendar, color: 'bg-sky-500/10 text-sky-400 border border-sky-500/20' },
  DUE_DATE_UPDATED: { Icon: Calendar, color: 'bg-sky-500/10 text-sky-400 border border-sky-500/20' },
  TICKET_SUSPENDED: { Icon: AlertTriangle, color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' },
  TICKET_RESTORED: { Icon: Play, color: 'bg-teal-500/10 text-teal-400 border border-teal-500/20' },
  TICKET_REJECTED: { Icon: ShieldX, color: 'bg-rose-600/10 text-rose-400 border border-rose-600/20' },
  TICKET_ASSIGNED_TO_MEMBER: { Icon: UserCheck, color: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
  TICKET_REASSIGNED_TO_MEMBER: { Icon: UserCheck, color: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  TICKET_OPENED: { Icon: Unlock, color: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  TICKET_IN_PROGRESS: { Icon: Play, color: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  TICKET_CLOSED: { Icon: CheckCircle2, color: 'bg-gray-500/10 text-gray-400 border border-gray-500/20' },
  COMMENT_ADDED: { Icon: MessageSquare, color: 'bg-pink-500/10 text-pink-400 border border-pink-500/20' },
  ATTACHMENT_FLAGGED: { Icon: Flag, color: 'bg-red-600/10 text-red-400 border border-red-600/20' },
};

const ACTION_LABELS = {
  TICKET_CREATED: 'Ticket Created',
  TICKET_AUTO_ALLOCATED_TEAM: 'Team Auto-Allocated',
  TICKET_MANUALLY_ALLOCATED_TEAM: 'Team Allocated Manually',
  TICKET_REALLOCATED_TEAM: 'Team Reallocated',
  PRIORITY_CHANGED: 'Priority Changed',
  DUE_DATE_SET: 'Due Date Set',
  DUE_DATE_UPDATED: 'Due Date Updated',
  TICKET_SUSPENDED: 'Ticket Suspended',
  TICKET_RESTORED: 'Ticket Restored',
  TICKET_REJECTED: 'Ticket Rejected',
  TICKET_ASSIGNED_TO_MEMBER: 'Agent Allocated',
  TICKET_REASSIGNED_TO_MEMBER: 'Agent Reallocated',
  TICKET_OPENED: 'Ticket Opened',
  TICKET_IN_PROGRESS: 'Work Started',
  TICKET_CLOSED: 'Ticket Closed & Resolved',
  COMMENT_ADDED: 'Comment Added',
  ATTACHMENT_FLAGGED: 'Attachment Flagged',
};

const ROLE_LABELS = {
  'super-admin': 'Super Admin',
  super_admin: 'Super Admin',
  admin: 'Admin',
  team_admin: 'Team Admin',
  team_user: 'Agent',
  user: 'User',
};

const ROLE_BADGES = {
  super_admin: 'bg-red-500/10 text-red-400 border border-red-500/20',
  'super-admin': 'bg-red-500/10 text-red-400 border border-red-500/20',
  admin: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  team_admin: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  team_user: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  user: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// Subcomponent to render inline ticket timeline in tickets raised list
const InlineTicketTimeline = ({ ticketId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await getTicketLogs(ticketId);
        setLogs(data);
      } catch (err) {
        console.error('Failed to load inline ticket logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [ticketId]);

  if (loading) {
    return <div className="text-xs text-zinc-500 p-3">Loading historical trail...</div>;
  }

  if (logs.length === 0) {
    return <div className="text-xs text-zinc-600 p-3">No timeline logs found.</div>;
  }

  return (
    <div className="border-l border-zinc-800 ml-3 pl-4 space-y-3 py-2">
      {logs.map((log) => {
        const config = ACTION_ICONS[log.action] || { Icon: Clock, color: 'bg-zinc-800 text-zinc-500 border border-zinc-700' };
        const LogIcon = config.Icon;
        return (
          <div key={log._id} className="relative flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
            <div className="absolute -left-[23px] top-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800">
              <LogIcon className="w-2.5 h-2.5 text-zinc-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-300">{ACTION_LABELS[log.action] || log.action}</span>
              <span className="text-zinc-500 text-[10px]">• by {log.performedBy?.name}</span>
            </div>
            <span className="text-[10px] text-zinc-500">{new Date(log.timestamp).toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
};

const UserActivity = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('raised');
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const { data } = await getUserActivity(id);
        setActivityData(data);
      } catch (err) {
        toast.error('Failed to load user activity trail.');
        navigate('/admin/users');
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [id, navigate]);

  const toggleExpandTicket = (ticketId) => {
    setExpandedTicketId(expandedTicketId === ticketId ? null : ticketId);
  };

  if (loading) {
    return (
      <div className="page-body flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3 text-zinc-400">
          <Clock className="w-6 h-6 animate-spin text-teal-400" />
          <span className="text-lg">Loading User Activity trail...</span>
        </div>
      </div>
    );
  }

  const { user, ticketsRaised, actionsTaken, performance } = activityData;
  const isAgent = user.role === 'team_user';

  return (
    <div className="page-body fade-in space-y-6">
      {/* Back Button */}
      <button 
        className="btn btn-ghost btn-sm flex items-center gap-2 text-zinc-400 hover:text-white" 
        onClick={() => navigate('/admin/users')}
      >
        <ArrowLeft className="w-4 h-4" /> Back to User Management
      </button>

      {/* User Information Header Card */}
      <div className="bg-[#1c2128] border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-teal-500/20 to-indigo-500/20 border border-zinc-700 flex items-center justify-center text-teal-400">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              {user.name}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${ROLE_BADGES[user.role]}`}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-1.5 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-zinc-500" /> {user.email}</span>
              {user.department && <span className="text-zinc-500">• Dept: {user.department}</span>}
              <span>• Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          {user.isActive ? (
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Active Status
            </span>
          ) : (
            <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-sm font-semibold flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Suspended Status
            </span>
          )}
        </div>
      </div>

      {/* Interactive Tab Headers */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('raised')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors duration-150 flex items-center gap-2 ${
            activeTab === 'raised' 
              ? 'border-teal-500 text-teal-400' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <FileText className="w-4.5 h-4.5" />
          Tickets Raised ({ticketsRaised.length})
        </button>

        <button
          onClick={() => setActiveTab('actions')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors duration-150 flex items-center gap-2 ${
            activeTab === 'actions' 
              ? 'border-teal-500 text-teal-400' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <History className="w-4.5 h-4.5" />
          Actions Taken ({actionsTaken.length})
        </button>

        {isAgent && (
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors duration-150 flex items-center gap-2 ${
              activeTab === 'performance' 
                ? 'border-teal-500 text-teal-400' 
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4.5 h-4.5" />
            Time Performance Metrics
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {/* Tab 1: Tickets Raised */}
        {activeTab === 'raised' && (
          <div className="bg-[#1c2128] border border-zinc-800 rounded-2xl overflow-hidden">
            {ticketsRaised.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                This user has not raised any support tickets.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80">
                {ticketsRaised.map((ticket) => {
                  const isExpanded = expandedTicketId === ticket._id;
                  return (
                    <div key={ticket._id} className="p-4 sm:p-5 hover:bg-zinc-900/10 transition-colors duration-150">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center flex-wrap gap-2.5">
                            <span className="text-xs text-zinc-500 font-mono">
                              #{ticket._id.slice(-6).toUpperCase()}
                            </span>
                            <StatusBadge status={ticket.status} />
                            <PriorityBadge priority={ticket.priority} />
                            <span className="text-xs text-zinc-400 bg-zinc-800/40 px-2 py-0.5 rounded border border-zinc-800">
                              {ticket.category}
                            </span>
                          </div>
                          <Link 
                            to={`/tickets/${ticket._id}`}
                            className="text-white hover:text-teal-400 font-semibold block transition-colors text-base"
                          >
                            {ticket.title}
                          </Link>
                          <div className="text-xs text-zinc-500">
                            Created on {new Date(ticket.createdAt).toLocaleString()} 
                            {ticket.assignedToUser && ` • Assigned to agent: ${ticket.assignedToUser.name}`}
                          </div>
                        </div>

                        <button 
                          onClick={() => toggleExpandTicket(ticket._id)}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors self-center"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-zinc-800/60 bg-zinc-950/20 p-4 rounded-xl">
                          <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3">Historical Audit Trail</h4>
                          <InlineTicketTimeline ticketId={ticket._id} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Actions Taken */}
        {activeTab === 'actions' && (
          <div className="bg-[#1c2128] border border-zinc-800 rounded-2xl p-6">
            {actionsTaken.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">
                No system actions recorded for this user.
              </div>
            ) : (
              <div className="relative border-l border-zinc-800 ml-3 pl-6 space-y-6">
                {actionsTaken.map((log) => {
                  const config = ACTION_ICONS[log.action] || { Icon: Clock, color: 'bg-zinc-800 text-zinc-400' };
                  const LogIcon = config.Icon;
                  return (
                    <div key={log._id} className="relative group">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[35px] top-1 w-6 h-6 rounded-full flex items-center justify-center ${config.color} shadow-md`}>
                        <LogIcon className="w-3 h-3" />
                      </div>
                      
                      {/* Log details */}
                      <div className="space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-semibold text-white text-sm">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {log.ticketId && (
                          <div className="text-xs text-zinc-400">
                            On Ticket:{' '}
                            <Link to={`/tickets/${log.ticketId._id}`} className="text-teal-400 font-medium hover:underline">
                              {log.ticketId.title}
                            </Link>
                          </div>
                        )}
                        {log.metadata?.note && (
                          <div className="text-xs italic text-zinc-500 mt-1">
                            "{log.metadata.note}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Time Performance Summary */}
        {activeTab === 'performance' && isAgent && (
          <div className="space-y-6">
            {/* Grid of Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card: Active Workload */}
              <div className="bg-[#1c2128] border border-zinc-800 rounded-xl p-5 shadow-sm">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                  Active Workload
                </span>
                <span className="text-2xl font-bold text-white block">
                  {performance.workloadCount} Tickets
                </span>
                <span className="text-xs text-zinc-500 mt-1 block">
                  Tickets currently active / in progress
                </span>
              </div>

              {/* Card: Resolved Count */}
              <div className="bg-[#1c2128] border border-zinc-800 rounded-xl p-5 shadow-sm">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                  Resolved Tickets
                </span>
                <span className="text-2xl font-bold text-white block">
                  {performance.resolvedCount} Resolved
                </span>
                <span className="text-xs text-zinc-500 mt-1 block">
                  Total tickets successfully resolved
                </span>
              </div>

              {/* Card: Avg Resolution Time */}
              <div className="bg-[#1c2128] border border-zinc-800 rounded-xl p-5 shadow-sm">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                  Avg Resolution Speed
                </span>
                <span className="text-2xl font-bold text-teal-400 block">
                  {performance.averageResolveTime}
                </span>
                <span className="text-xs text-zinc-500 mt-1 block">
                  Average duration from start to resolution
                </span>
              </div>

              {/* Card: Resolution Extrema */}
              <div className="bg-[#1c2128] border border-zinc-800 rounded-xl p-5 shadow-sm space-y-2">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Fastest Resolution</span>
                  <span className="text-sm font-bold text-emerald-400">{performance.fastestResolveTime}</span>
                </div>
                <div className="border-t border-zinc-800/60 pt-1.5">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Slowest Resolution</span>
                  <span className="text-sm font-bold text-rose-400">{performance.slowestResolveTime}</span>
                </div>
              </div>
            </div>

            {/* Performance Analytics Context Panel */}
            <div className="bg-gradient-to-br from-[#1c2128] to-[#14191f] border border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-semibold text-white mb-3">Agent Productivity Profile</h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">
                These metrics provide a direct, auditable profile of this agent's efficiency and workload. 
                Average resolution speeds are calculated dynamically from historical ticket lifecycle timestamps, 
                benchmarked against SLA targets to ensure performance and quality metrics are met.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserActivity;
