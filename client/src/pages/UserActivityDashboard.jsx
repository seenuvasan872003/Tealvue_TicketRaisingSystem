import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// ─── Skeleton Components ──────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="animate-pulse bg-white/5 rounded-2xl p-6 border border-white/10">
    <div className="h-4 bg-white/10 rounded w-1/3 mb-3"></div>
    <div className="h-8 bg-white/10 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-white/10 rounded w-2/3"></div>
  </div>
);

const SkeletonRow = () => (
  <div className="animate-pulse flex items-center gap-4 p-4 border-b border-white/5">
    <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0"></div>
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-white/10 rounded w-1/3"></div>
      <div className="h-3 bg-white/10 rounded w-1/4"></div>
    </div>
    <div className="h-3 bg-white/10 rounded w-20"></div>
    <div className="h-3 bg-white/10 rounded w-16"></div>
  </div>
);

// ─── Role Badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const map = {
    'super-admin': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    admin:        'bg-blue-500/20 text-blue-300 border-blue-500/30',
    team_admin:   'bg-teal-500/20 text-teal-300 border-teal-500/30',
    team_user:    'bg-green-500/20 text-green-300 border-green-500/30',
    user:         'bg-gray-500/20 text-gray-300 border-gray-500/30'
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[role] || map.user}`}>
      {role?.replace('_', ' ').replace('-', ' ')}
    </span>
  );
};

// ─── Status Dot ───────────────────────────────────────────────────────────────
const StatusDot = ({ isOnline }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-gray-500'}`}></span>
);

// ─── User Avatar ─────────────────────────────────────────────────────────────
const Avatar = ({ name, avatar }) => {
  const initials = (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (avatar) return <img src={avatar.startsWith('http') ? avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${avatar}`} alt={name} className="w-10 h-10 rounded-full object-cover border border-teal-500/30" />;
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/30 to-teal-700/30 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-sm">
      {initials}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="relative overflow-hidden bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-teal-500/30 transition-all duration-300">
    <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-10 ${color}`}></div>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{value ?? '—'}</p>
        {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-opacity-20`}>
        <i className={`${icon} text-lg text-white`}></i>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserActivityDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  const prefix = role === 'super-admin' ? 'super-admin' : 'admin';
  const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/${prefix}/user-activity`;
  const headers = { Authorization: `Bearer ${token}` };

  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const pollRef = useRef(null);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}/stats`, { headers });
      setStats(res.data);
    } catch (_) {}
    setStatsLoading(false);
  }, [BASE, token]);

  // Fetch user list
  const fetchUsers = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (search)     params.search = search;
      if (roleFilter) params.role   = roleFilter;
      const res = await axios.get(`${BASE}/users`, { headers, params });
      setUsers(res.data.data || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch (_) {}
    setLoading(false);
  }, [BASE, token, search, roleFilter]);

  useEffect(() => {
    fetchStats();
    fetchUsers(1);
  }, []);

  // 30-second polling for stats
  useEffect(() => {
    pollRef.current = setInterval(fetchStats, 30_000);
    return () => clearInterval(pollRef.current);
  }, [fetchStats]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchUsers(1), 500);
    return () => clearTimeout(t);
  }, [search, roleFilter]);

  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const isOnline = (u) => u.lastActiveAt && new Date(u.lastActiveAt).getTime() > fiveMinAgo;

  const viewUser = (uid) => {
    navigate(`/${prefix}/user-activity/${uid}`);
  };

  return (
    <div className="min-h-screen text-white px-4 py-6 md:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">User Activity</h1>
          <p className="text-sm text-white/40 mt-0.5">Real-time monitoring · auto-refreshes every 30s</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse inline-block"></span>
          Live
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon="ti-users" label="Tracked Users"  value={stats?.totalUsersTracked} color="bg-teal-500" />
            <StatCard icon="ti-login" label="Logins Today"   value={stats?.loginsToday}        color="bg-blue-500" />
            <StatCard icon="ti-bolt"  label="Triggers Today" value={stats?.triggersToday}      color="bg-purple-500" />
            <StatCard icon="ti-device-desktop" label="Active Sessions" value={stats?.activeSessions} color="bg-green-500" />
            <StatCard icon="ti-user-check" label="Online Now" value={stats?.activeUsers}       sub="Active ≤5 min" color="bg-orange-500" />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="ti-search absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm"></i>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-teal-500/60 transition"
          />
        </div>
        {role === 'super-admin' && (
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/60 transition"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="team_admin">Team Admin</option>
            <option value="team_user">Team User</option>
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr_0.7fr] gap-4 px-5 py-3 border-b border-white/10 text-xs text-white/30 uppercase tracking-widest">
          <span>User</span>
          <span>Role</span>
          <span>Logins</span>
          <span>Triggers</span>
          <span>Last Active</span>
          <span className="text-right">Status</span>
        </div>

        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-white/30">
            <i className="ti-user-off text-4xl mb-3"></i>
            <p className="text-sm">No users tracked yet</p>
          </div>
        ) : (
          users.map(u => {
            const ud = u.user || {};
            const online = isOnline(u);
            return (
              <div
                key={u._id}
                onClick={() => viewUser(u.userId)}
                className="grid grid-cols-1 md:grid-cols-[2.5fr_1fr_1fr_1fr_1fr_0.7fr] gap-4 items-center px-5 py-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
              >
                {/* User */}
                <div className="flex items-center gap-3">
                  <Avatar name={ud.name || u.userName} avatar={ud.avatar} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-white truncate group-hover:text-teal-300 transition-colors">
                      {ud.name || u.userName}
                    </p>
                    <p className="text-xs text-white/30 truncate">{ud.email}</p>
                  </div>
                </div>
                {/* Role */}
                <div><RoleBadge role={ud.role || u.userRole} /></div>
                {/* Logins */}
                <div className="text-sm text-white/70">{u.totalLogins ?? 0}</div>
                {/* Triggers */}
                <div className="text-sm text-white/70">{u.totalTriggers ?? 0}</div>
                {/* Last Active */}
                <div className="text-xs text-white/40">
                  {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : '—'}
                </div>
                {/* Status */}
                <div className="md:text-right flex md:justify-end items-center gap-1.5">
                  <StatusDot isOnline={online} />
                  <span className={`text-xs ${online ? 'text-green-400' : 'text-white/30'}`}>
                    {online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {total > 15 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / 15) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => fetchUsers(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                p === page
                  ? 'bg-teal-500 text-white shadow-[0_0_12px_rgba(20,184,166,0.4)]'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
