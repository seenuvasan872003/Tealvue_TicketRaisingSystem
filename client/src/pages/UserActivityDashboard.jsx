import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// ─── Skeleton Components ──────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="animate-pulse bg-white/5 rounded-2xl p-6 border border-white/10 shadow-lg">
    <div className="h-3 bg-white/10 rounded w-1/3 mb-4"></div>
    <div className="h-8 bg-white/10 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-white/10 rounded w-2/3"></div>
  </div>
);

const SkeletonGridCard = () => (
  <div className="animate-pulse bg-white/5 rounded-2xl p-5 border border-white/10 h-44 flex flex-col justify-between">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-white/10"></div>
      <div className="space-y-2 flex-1">
        <div className="h-3 bg-white/10 rounded w-2/3"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
      </div>
    </div>
    <div className="h-3 bg-white/10 rounded w-1/3"></div>
    <div className="flex gap-4">
      <div className="h-3 bg-white/10 rounded flex-1"></div>
      <div className="h-3 bg-white/10 rounded flex-1"></div>
    </div>
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
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${map[role] || map.user}`}>
      {role?.replace('_', ' ').replace('-', ' ')}
    </span>
  );
};

// ─── Status Indicator ─────────────────────────────────────────────────────────
const StatusDot = ({ isOnline }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-gray-500'}`}></span>
);

// ─── User Avatar ─────────────────────────────────────────────────────────────
const Avatar = ({ name, avatar }) => {
  const initials = (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (avatar) return <img src={avatar.startsWith('http') ? avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${avatar}`} alt={name} className="w-12 h-12 rounded-full object-cover border-2 border-teal-500/40 shadow-md" />;
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500/30 to-teal-700/30 border border-teal-500/30 flex items-center justify-center text-teal-300 font-extrabold text-sm shadow-md">
      {initials}
    </div>
  );
};

// ─── Premium Overhauled Stat Card ─────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, colorClass, borderClass, textGlow, iconBg, shadowGlow }) => (
  <div className={`relative overflow-hidden bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 border ${borderClass} hover:border-white/20 transition-all duration-300 group shadow-lg hover:-translate-y-1 ${shadowGlow}`}>
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 bg-white group-hover:scale-125 transition-transform duration-500"></div>
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1.5">{label}</p>
        <p className={`text-4xl font-extrabold tracking-tight ${colorClass} ${textGlow}`}>{value ?? '0'}</p>
        {sub && <p className="text-[10px] text-white/30 mt-2 font-medium">{sub}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg} border border-white/5 shadow-inner group-hover:rotate-6 transition-transform duration-300`}>
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
      const params = { page: p, limit: 12 };
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
    const t = setTimeout(() => fetchUsers(1), 400);
    return () => clearTimeout(t);
  }, [search, roleFilter]);

  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const isOnline = (u) => u.lastActiveAt && new Date(u.lastActiveAt).getTime() > fiveMinAgo;

  const viewUser = (uid) => {
    navigate(`/${prefix}/user-activity/${uid}`);
  };

  return (
    <div className="min-h-screen text-white px-4 py-6 md:px-6 space-y-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-950/20 via-neutral-950 to-neutral-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-teal-400 bg-clip-text text-transparent">User Activity Tracking</h1>
          <p className="text-sm text-white/40 mt-1">Monitor real-time user trigger events and sessions</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1.5 w-fit">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></span>
          <span className="text-white/60 font-semibold tracking-wider uppercase text-[10px]">Live Monitoring</span>
        </div>
      </div>

      {/* OVERHAULED STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard 
              icon="ti-users" 
              label="Total Users" 
              value={stats?.totalUsersTracked} 
              colorClass="text-teal-400" 
              textGlow="drop-shadow-[0_0_10px_rgba(45,212,191,0.3)]"
              borderClass="border-teal-500/15" 
              iconBg="bg-teal-500/20"
              shadowGlow="hover:shadow-teal-500/5"
            />
            <StatCard 
              icon="ti-login" 
              label="Logins Today" 
              value={stats?.loginsToday} 
              colorClass="text-blue-400" 
              textGlow="drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]"
              borderClass="border-blue-500/15" 
              iconBg="bg-blue-500/20"
              shadowGlow="hover:shadow-blue-500/5"
            />
            <StatCard 
              icon="ti-bolt" 
              label="Triggers Today" 
              value={stats?.triggersToday} 
              colorClass="text-purple-400" 
              textGlow="drop-shadow-[0_0_10px_rgba(192,132,252,0.3)]"
              borderClass="border-purple-500/15" 
              iconBg="bg-purple-500/20"
              shadowGlow="hover:shadow-purple-500/5"
            />
            <StatCard 
              icon="ti-device-desktop" 
              label="Active Sessions" 
              value={stats?.activeSessions} 
              colorClass="text-emerald-400" 
              textGlow="drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]"
              borderClass="border-emerald-500/15" 
              iconBg="bg-emerald-500/20"
              shadowGlow="hover:shadow-emerald-500/5"
            />
            <StatCard 
              icon="ti-user-check" 
              label="Online Now" 
              value={stats?.activeUsers} 
              sub="Active within 5 minutes" 
              colorClass="text-amber-400" 
              textGlow="drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]"
              borderClass="border-amber-500/15" 
              iconBg="bg-amber-500/20"
              shadowGlow="hover:shadow-amber-500/5"
            />
          </>
        )}
      </div>

      {/* OVERHAULED SEARCH & FILTERS BAR */}
      <div className="flex flex-col md:flex-row gap-4 bg-white/[0.02] backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-transparent to-transparent opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none"></div>
        <div className="relative flex-1 group/input">
          <i className="ti-search absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-base transition-colors group-focus-within/input:text-teal-400"></i>
          <input
            type="text"
            placeholder="Filter list by user name, email, or role keywords..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-teal-500/40 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none shadow-inner transition-all duration-300 focus:shadow-[0_0_15px_rgba(20,184,166,0.15)]"
          />
        </div>
        {role === 'super-admin' && (
          <div className="relative min-w-[200px]">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-teal-500/40 rounded-xl px-4 py-3 text-sm text-white/70 focus:outline-none transition-all duration-300 cursor-pointer appearance-none"
            >
              <option value="" className="bg-neutral-950 text-white/80">All Activity Roles</option>
              <option value="user" className="bg-neutral-950 text-white/80">User</option>
              <option value="admin" className="bg-neutral-950 text-white/80">Admin</option>
              <option value="team_admin" className="bg-neutral-950 text-white/80">Team Admin</option>
              <option value="team_user" className="bg-neutral-950 text-white/80">Team User</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
              <i className="ti-angle-down text-xs"></i>
            </div>
          </div>
        )}
      </div>

      {/* Grid of Users */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonGridCard key={i} />)
        ) : users.length === 0 ? (
          <div className="col-span-full flex flex-col items-center py-20 text-white/20 bg-white/5 rounded-2xl border border-white/5">
            <i className="ti-face-sad text-5xl mb-3"></i>
            <p className="text-sm font-medium">No users match your criteria</p>
          </div>
        ) : (
          users.map(u => {
            const ud = u.user || {};
            const online = isOnline(u);
            return (
              <div
                key={u._id}
                onClick={() => viewUser(u.userId)}
                className="group relative bg-gradient-to-b from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/[0.04] backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-teal-500/40 hover:shadow-[0_8px_30px_rgba(20,184,166,0.1)] transition-all duration-300 cursor-pointer flex flex-col justify-between h-48"
              >
                {/* Top Section */}
                <div className="flex items-start gap-4">
                  <Avatar name={ud.name || u.userName} avatar={ud.avatar} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-sm text-white group-hover:text-teal-300 transition-colors truncate">
                        {ud.name || u.userName}
                      </h3>
                      <RoleBadge role={ud.role || u.userRole} />
                    </div>
                    <p className="text-xs text-white/40 truncate mt-0.5">{ud.email}</p>
                  </div>
                </div>

                {/* Middle details */}
                <div className="text-[11px] text-white/30 font-medium">
                  Last Active: <span className="text-white/60 font-semibold">{u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : 'Never'}</span>
                </div>

                {/* Bottom stats row */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Logins</p>
                      <p className="text-xs font-bold text-teal-400 mt-0.5">{u.totalLogins ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Triggers</p>
                      <p className="text-xs font-bold text-purple-400 mt-0.5">{u.totalTriggers ?? 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                    <StatusDot isOnline={online} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${online ? 'text-green-400' : 'text-white/30'}`}>
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {total > 12 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: Math.ceil(total / 12) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => fetchUsers(p)}
              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all duration-300 ${
                p === page
                  ? 'bg-teal-500 text-white shadow-[0_0_12px_rgba(20,184,166,0.5)]'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
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
