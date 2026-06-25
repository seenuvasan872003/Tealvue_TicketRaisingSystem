import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, getUserActivity } from '../services/userApi';
import { getTicketLogs, getTicketTimeSummary } from '../services/ticketApi';
import { 
  User, Mail, ArrowLeft, Clock, FileText, ChevronRight,
  Plus, Target, RefreshCw, Calendar, AlertTriangle, Play,
  XCircle, UserCheck, Unlock, CheckCircle2, MessageSquare, Flag, Cpu, ShieldAlert, ShieldX
} from 'lucide-react';
import { toast } from 'react-toastify';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';

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
  TICKET_DECLINED_BY_ADMIN: { Icon: ShieldX, color: 'bg-rose-600/10 text-rose-400 border border-rose-600/20' },
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
  TICKET_DECLINED_BY_ADMIN: 'Ticket Declined by Admin',
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
  system: 'System',
};

const ROLE_BADGES = {
  super_admin: 'bg-red-500/10 text-red-400 border border-red-500/20',
  'super-admin': 'bg-red-500/10 text-red-400 border border-red-500/20',
  admin: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  team_admin: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  team_user: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  user: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  system: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

const TicketLogs = () => {
  // Navigation States: 'users' -> 'tickets' -> 'log'
  const [viewState, setViewState] = useState('users'); 
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketLogs, setTicketLogs] = useState([]);
  const [timeSummary, setTimeSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // 1. Fetch Users on mount
  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data } = await getAllUsers({ role: 'user', limit: 100 });
      const rawUsers = Array.isArray(data) ? data : (data.users || []);
      // Client-side filter to guarantee only 'user' role is displayed
      setUsers(rawUsers.filter(u => u.role === 'user'));
    } catch (err) {
      toast.error('Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 2. Fetch User's Tickets when user is selected
  const handleSelectUser = async (userObj) => {
    try {
      setLoading(true);
      setSelectedUser(userObj);
      const { data } = await getUserActivity(userObj._id);
      setTickets(data.ticketsRaised || []);
      setViewState('tickets');
      setSearch('');
    } catch (err) {
      toast.error('Failed to load tickets for selected user.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Ticket's Logs when ticket is selected
  const handleSelectTicket = async (ticketObj) => {
    try {
      setLoading(true);
      setSelectedTicket(ticketObj);
      const [logsRes, summaryRes] = await Promise.allSettled([
        getTicketLogs(ticketObj._id),
        getTicketTimeSummary(ticketObj._id)
      ]);

      if (logsRes.status === 'fulfilled') {
        setTicketLogs(logsRes.value.data);
      }
      if (summaryRes.status === 'fulfilled') {
        setTimeSummary(summaryRes.value.data);
      }
      setViewState('log');
    } catch (err) {
      toast.error('Failed to load ticket lifecycle logs.');
    } finally {
      setLoading(false);
    }
  };

  // Back actions
  const handleBackToUsers = () => {
    setSelectedUser(null);
    setTickets([]);
    setViewState('users');
    setSearch('');
  };

  const handleBackToTickets = () => {
    setSelectedTicket(null);
    setTicketLogs([]);
    setTimeSummary(null);
    setViewState('tickets');
  };

  // Filters
  const filteredUsers = users.filter((u) => {
    const searchLower = search.toLowerCase();
    return u.name?.toLowerCase().includes(searchLower) || u.email?.toLowerCase().includes(searchLower);
  });

  const filteredTickets = tickets.filter((t) => {
    const searchLower = search.toLowerCase();
    return t.title?.toLowerCase().includes(searchLower) || t.category?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="page-body fade-in space-y-6">
      {/* ────────────────── VIEW 1: USER DIRECTORY ────────────────── */}
      {viewState === 'users' && (
        <div className="space-y-6">
          <div className="page-header">
            <div>
              <h1 className="page-title">Ticket Lifecycle Logs</h1>
              <p className="page-subtitle">Select a user to audit their ticket history and tracking timelines.</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-[#1c2128] border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <input
              className="form-input w-full"
              placeholder="Search user directory by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <Clock className="w-6 h-6 animate-spin text-teal-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-[#1c2128] border border-dashed border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
              No users found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((u) => (
                <div
                  key={u._id}
                  onClick={() => handleSelectUser(u)}
                  className="bg-[#1c2128] border border-zinc-800 rounded-2xl p-5 hover:border-teal-500/40 cursor-pointer transition-all duration-150 flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    <div className="w-11 h-11 rounded-full bg-teal-500/10 border border-zinc-800 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-semibold text-white truncate text-sm sm:text-base group-hover:text-teal-400 transition-colors">
                        {u.name}
                      </h3>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{u.email}</p>
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${ROLE_BADGES[u.role] || 'bg-zinc-800 text-zinc-400'}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────── VIEW 2: USER'S TICKETS ────────────────── */}
      {viewState === 'tickets' && selectedUser && (
        <div className="space-y-6">
          <button 
            className="btn btn-ghost btn-sm flex items-center gap-2 text-zinc-400 hover:text-white" 
            onClick={handleBackToUsers}
          >
            <ArrowLeft className="w-4 h-4" /> Back to User Directory
          </button>

          <div className="bg-[#1c2128] border border-zinc-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                Tickets submitted by: <span className="text-teal-400">{selectedUser.name}</span>
              </h1>
              <p className="text-sm text-zinc-400 mt-0.5">{selectedUser.email}</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-[#1c2128] border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <input
              className="form-input w-full"
              placeholder="Search tickets by title or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <Clock className="w-6 h-6 animate-spin text-teal-400" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-[#1c2128] border border-dashed border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
              No tickets found for this user.
            </div>
          ) : (
            <div className="bg-[#1c2128] border border-zinc-800 rounded-2xl divide-y divide-zinc-800/80 overflow-hidden shadow-sm">
              {filteredTickets.map((t) => (
                <div 
                  key={t._id}
                  onClick={() => handleSelectTicket(t)}
                  className="p-5 hover:bg-zinc-900/10 cursor-pointer transition-colors duration-150 flex items-center justify-between group"
                >
                  <div className="space-y-1.5 overflow-hidden flex-1 pr-4">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-xs text-zinc-500 font-mono">
                        #{t._id.slice(-6).toUpperCase()}
                      </span>
                      <StatusBadge status={t.approvalStatus === 'rejected' ? 'rejected' : t.status} />
                      <PriorityBadge priority={t.priority} />
                      <span className="text-xs text-zinc-400 bg-zinc-800/40 px-2 py-0.5 rounded border border-zinc-800">
                        {t.category}
                      </span>
                    </div>
                    <h3 className="font-semibold text-white text-base truncate group-hover:text-teal-400 transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Submitted on {new Date(t.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────── VIEW 3: TICKET LIFECYCLE TIMELINE ────────────────── */}
      {viewState === 'log' && selectedTicket && selectedUser && (
        <div className="space-y-6">
          <button 
            className="btn btn-ghost btn-sm flex items-center gap-2 text-zinc-400 hover:text-white" 
            onClick={handleBackToTickets}
          >
            <ArrowLeft className="w-4 h-4" /> Back to {selectedUser.name}'s Tickets
          </button>

          {/* Ticket Context Card */}
          <div className="bg-[#1c2128] border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center flex-wrap gap-2.5">
              <span className="text-xs text-zinc-500 font-mono">
                #{selectedTicket._id.slice(-6).toUpperCase()}
              </span>
              <StatusBadge status={selectedTicket.approvalStatus === 'rejected' ? 'rejected' : selectedTicket.status} />
              <PriorityBadge priority={selectedTicket.priority} />
              <span className="text-xs text-zinc-400 bg-zinc-800/40 px-2 py-0.5 rounded border border-zinc-800">
                {selectedTicket.category}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">{selectedTicket.title}</h1>
            <p className="text-xs text-zinc-500">
              Raised by {selectedUser.name} ({selectedUser.email}) on {new Date(selectedTicket.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Timeline Stream */}
          {loading ? (
            <div className="flex justify-center p-12">
              <Clock className="w-6 h-6 animate-spin text-teal-400" />
            </div>
          ) : ticketLogs.length === 0 ? (
            <div className="bg-[#1c2128] border border-dashed border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
              No audit logs found for this ticket.
            </div>
          ) : (
            <div className="relative border-l border-zinc-800 ml-4 pl-6 space-y-5">
              {ticketLogs.map((log) => {
                const actionConfig = ACTION_ICONS[log.action] || { Icon: Clock, color: 'bg-zinc-800 text-zinc-500 border border-zinc-700' };
                const LogIcon = actionConfig.Icon;
                const roleBadgeClass = ROLE_BADGES[log.performedBy?.role] || 'bg-zinc-800 text-zinc-400';

                return (
                  <div key={log._id} className="relative group">
                    {/* Circle dot icon */}
                    <div className={`absolute -left-[35px] top-1.5 w-6.5 h-6.5 rounded-full flex items-center justify-center ${actionConfig.color} border shadow-sm`}>
                      <LogIcon className="w-3 h-3" strokeWidth={2.5} />
                    </div>

                    {/* Audit Card */}
                    <div className="bg-[#1c2128] border border-zinc-800 rounded-xl p-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                        <span className="font-semibold text-white text-sm sm:text-base">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      {/* Performer */}
                      <div className="flex items-center gap-2 text-xs mb-3">
                        <span className="text-zinc-400 font-medium">{log.performedBy?.name || 'System'}</span>
                        <span className="text-zinc-500">({log.performedBy?.email})</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${roleBadgeClass}`}>
                          {ROLE_LABELS[log.performedBy?.role] || log.performedBy?.role}
                        </span>
                      </div>

                      {/* Metadata */}
                      {log.metadata && (
                        <div className="space-y-1.5 text-xs sm:text-sm text-zinc-300">
                          {log.metadata.teamName && (
                            <div>
                              <span className="text-zinc-500 font-medium">Allocated Team:</span>{' '}
                              <span className="text-teal-400 font-semibold">{log.metadata.teamName}</span>
                            </div>
                          )}
                          {log.metadata.assignedToUserName && (
                            <div>
                              <span className="text-zinc-500 font-medium">Assigned Agent:</span>{' '}
                              <span className="text-violet-400 font-semibold">{log.metadata.assignedToUserName}</span>
                            </div>
                          )}
                          {(log.metadata.previousValue || log.metadata.newValue) && (
                            <div className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded border border-zinc-800/30 w-fit">
                              {log.metadata.previousValue && (
                                <>
                                  <span className="text-zinc-500 font-medium">From:</span>
                                  <span className="line-through text-red-400">{log.metadata.previousValue}</span>
                                </>
                              )}
                              <span className="text-zinc-500 font-medium">→ To:</span>
                              <span className="text-green-400 font-semibold">{log.metadata.newValue}</span>
                            </div>
                          )}
                          {log.metadata.note && (
                            <div className="italic text-zinc-400 bg-zinc-900/20 p-2.5 rounded-lg border border-zinc-800/40 mt-1">
                              "{log.metadata.note}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Time Performance Analytics */}
          {timeSummary && (
            <div className="bg-gradient-to-br from-[#1c2128] to-[#14191f] border border-zinc-800 rounded-2xl p-6 shadow-md mt-6">
              <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Clock className="w-5 h-5 text-teal-400" />
                Ticket Time Performance Analytics
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block mb-1">
                    Time to Allocate
                  </span>
                  <span className="text-lg font-bold text-white block">
                    {timeSummary.formatted?.timeToAllocate || 'N/A'}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    From creation to team allocation
                  </span>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block mb-1">
                    Time to Assign
                  </span>
                  <span className="text-lg font-bold text-white block">
                    {timeSummary.formatted?.timeToAssign || 'N/A'}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    From team allocation to agent assignment
                  </span>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block mb-1">
                    Time In-Progress
                  </span>
                  <span className="text-lg font-bold text-white block">
                    {timeSummary.formatted?.timeInProgress || 'N/A'}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    Active time spent resolving the issue
                  </span>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block mb-1">
                    Total Resolution Time
                  </span>
                  <span className="text-lg font-bold text-teal-400 block">
                    {timeSummary.formatted?.timeToClose || 'N/A'}
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    From creation to ticket closure
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TicketLogs;
