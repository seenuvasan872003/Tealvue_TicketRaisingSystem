import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonRow = ({ cols = 4 }) => (
  <div className="animate-pulse flex items-center gap-4 p-4 border-b border-white/5">
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="h-3 bg-white/10 rounded" style={{ flex: i === 0 ? 2 : 1 }}></div>
    ))}
  </div>
);

const SkeletonProfile = () => (
  <div className="animate-pulse flex items-center gap-5 p-6 bg-white/5 rounded-2xl border border-white/10">
    <div className="w-16 h-16 rounded-full bg-white/10"></div>
    <div className="space-y-2 flex-1">
      <div className="h-5 bg-white/10 rounded w-1/3"></div>
      <div className="h-3 bg-white/10 rounded w-1/4"></div>
      <div className="h-3 bg-white/10 rounded w-1/5"></div>
    </div>
  </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
const EventBadge = ({ type }) => {
  const map = {
    LOGIN:                'bg-green-500/20 text-green-300 border-green-500/30',
    LOGOUT:               'bg-gray-500/20 text-gray-300 border-gray-500/30',
    API_TRIGGER:          'bg-blue-500/20 text-blue-300 border-blue-500/30',
    FAILED_LOGIN:         'bg-red-500/20 text-red-300 border-red-500/30',
    UNAUTHORIZED_ATTEMPT: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    ROUTE_ACCESS:         'bg-purple-500/20 text-purple-300 border-purple-500/30',
    FEATURE_ACCESS:       'bg-teal-500/20 text-teal-300 border-teal-500/30'
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[type] || map.API_TRIGGER}`}>
      {type?.replace(/_/g, ' ')}
    </span>
  );
};

const MethodBadge = ({ method }) => {
  const map = { GET: 'text-green-400', POST: 'text-blue-400', PUT: 'text-yellow-400', DELETE: 'text-red-400', PATCH: 'text-orange-400' };
  return <span className={`text-xs font-mono font-bold ${map[method] || 'text-white/50'}`}>{method}</span>;
};

// ─── Avatar ──────────────────────────────────────────────────────────────────
const Avatar = ({ name, avatar, size = 'md' }) => {
  const sz = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm';
  const initials = (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (avatar) return <img src={avatar.startsWith('http') ? avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${avatar}`} alt={name} className={`${sz} rounded-full object-cover border border-teal-500/30`} />;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-teal-500/30 to-teal-700/30 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold`}>
      {initials}
    </div>
  );
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview',  icon: 'ti-chart-bar' },
  { id: 'activity',  label: 'Activity',  icon: 'ti-list' },
  { id: 'sessions',  label: 'Sessions',  icon: 'ti-login' }
];

export default function UserActivityDetails() {
  const { uid }  = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const role     = user?.role;
  const prefix   = role === 'super-admin' ? 'super-admin' : role === 'admin' ? 'admin' : 'team-admin';
  const BASE     = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/${prefix}/user-activity`;
  const headers  = { Authorization: `Bearer ${token}` };

  const [tab,       setTab]       = useState('overview');
  const [profile,   setProfile]   = useState(null);
  const [summary,   setSummary]   = useState(null);
  const [logs,      setLogs]      = useState([]);
  const [sessions,  setSessions]  = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage,  setLogsPage]  = useState(1);
  const [evFilter,  setEvFilter]  = useState('');
  const [loading,   setLoading]   = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [sessLoading, setSessLoading] = useState(false);

  // Initial load
  useEffect(() => {
    const load = async () => {
      try {
        const sumRes = await axios.get(`${BASE}/${uid}/summary`, { headers });
        setSummary(sumRes.data.summary);
        setProfile(sumRes.data.user);
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, [uid]);

  const fetchLogs = useCallback(async (p = 1) => {
    setLogsLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (evFilter) params.eventType = evFilter;
      const res = await axios.get(`${BASE}/${uid}`, { headers, params });
      setLogs(res.data.logs || []);
      setLogsTotal(res.data.total || 0);
      setLogsPage(p);
    } catch (_) {}
    setLogsLoading(false);
  }, [uid, evFilter]);

  const fetchSessions = useCallback(async () => {
    setSessLoading(true);
    try {
      const res = await axios.get(`${BASE}/${uid}/sessions`, { headers });
      setSessions(res.data.sessions || []);
    } catch (_) {}
    setSessLoading(false);
  }, [uid]);

  useEffect(() => { if (tab === 'activity') fetchLogs(1); }, [tab, evFilter]);
  useEffect(() => { if (tab === 'sessions') fetchSessions(); }, [tab]);

  const formatDuration = (ms) => {
    if (!ms) return '—';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  return (
    <div className="min-h-screen text-white px-4 py-6 md:px-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-teal-300 transition-colors"
      >
        <i className="ti-arrow-left"></i> Back
      </button>

      {/* Profile Header */}
      {loading ? <SkeletonProfile /> : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
          <Avatar name={profile?.name} avatar={profile?.avatar} size="lg" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{profile?.name}</h2>
            <p className="text-sm text-white/40">{profile?.email}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {profile?.role?.replace('-', ' ').replace('_', ' ')}
              </span>
              <span className="text-xs text-white/30">
                Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
          {/* Mini stats */}
          <div className="flex gap-6 text-center">
            {[['Logins',   summary?.totalLogins], ['Logouts',  summary?.totalLogouts], ['Triggers', summary?.totalTriggers]].map(([l, v]) => (
              <div key={l}>
                <p className="text-2xl font-bold text-white">{v ?? 0}</p>
                <p className="text-xs text-white/30">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-teal-500 text-white shadow-[0_0_12px_rgba(20,184,166,0.3)]'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <i className={`${t.icon} text-xs`}></i>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ───────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white/5 rounded-2xl p-6 h-24 border border-white/10"></div>
          )) : [
            ['ti-login',         'Total Logins',    summary?.totalLogins   ?? 0, 'bg-green-500'],
            ['ti-logout',        'Total Logouts',   summary?.totalLogouts  ?? 0, 'bg-gray-500'],
            ['ti-bolt',          'Total Triggers',  summary?.totalTriggers ?? 0, 'bg-blue-500'],
            ['ti-clock',         'Last Active',     summary?.lastActiveAt ? new Date(summary.lastActiveAt).toLocaleString() : '—', 'bg-teal-500'],
            ['ti-login',         'Last Login',      summary?.lastLoginAt  ? new Date(summary.lastLoginAt).toLocaleString()  : '—', 'bg-purple-500'],
            ['ti-logout',        'Last Logout',     summary?.lastLogoutAt ? new Date(summary.lastLogoutAt).toLocaleString() : '—', 'bg-orange-500']
          ].map(([icon, label, value, color]) => (
            <div key={label} className={`relative overflow-hidden bg-white/5 rounded-2xl p-5 border border-white/10 hover:border-teal-500/30 transition`}>
              <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-10 ${color}`}></div>
              <p className="text-xs text-white/30 uppercase tracking-widest">{label}</p>
              <p className="text-2xl font-bold text-white mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Activity Tab ───────────────────────────────── */}
      {tab === 'activity' && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
          {/* Filter */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
            <select
              value={evFilter}
              onChange={e => setEvFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
            >
              <option value="">All Events</option>
              {['LOGIN','LOGOUT','API_TRIGGER','FAILED_LOGIN','UNAUTHORIZED_ATTEMPT','ROUTE_ACCESS','FEATURE_ACCESS'].map(ev => (
                <option key={ev} value={ev}>{ev.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <span className="text-xs text-white/30">{logsTotal} events</span>
          </div>

          {/* Log Header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr] gap-4 px-5 py-3 border-b border-white/5 text-xs text-white/30 uppercase tracking-widest">
            <span>Route</span><span>Method</span><span>Event</span><span>Timestamp</span><span>Status</span>
          </div>

          {logsLoading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-white/30">
              <i className="ti-list-search text-3xl mb-2"></i>
              <p className="text-sm">No logs found</p>
            </div>
          ) : (
            logs.map(log => (
              <div key={log._id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1.5fr_1fr] gap-4 items-center px-5 py-3 border-b border-white/5 hover:bg-white/5 transition">
                <span className="text-xs font-mono text-white/60 truncate" title={log.details?.route}>{log.details?.route || '—'}</span>
                <div><MethodBadge method={log.details?.method} /></div>
                <div><EventBadge type={log.eventType} /></div>
                <span className="text-xs text-white/40">{new Date(log.timestamp).toLocaleString()}</span>
                <span className={`text-xs font-mono ${
                  log.details?.statusCode >= 400 ? 'text-red-400' : 'text-green-400'
                }`}>{log.details?.statusCode ?? '—'}</span>
              </div>
            ))
          )}

          {/* Pagination */}
          {logsTotal > 20 && (
            <div className="flex justify-center gap-2 p-4">
              {Array.from({ length: Math.ceil(logsTotal / 20) }, (_, i) => i + 1).slice(0, 10).map(p => (
                <button
                  key={p}
                  onClick={() => fetchLogs(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    p === logsPage
                      ? 'bg-teal-500 text-white'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sessions Tab ───────────────────────────────── */}
      {tab === 'sessions' && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-white/10 text-xs text-white/30 uppercase tracking-widest">
            <span>Session ID</span><span>Login</span><span>Logout</span><span>Duration</span><span>Status</span>
          </div>

          {sessLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-white/30">
              <i className="ti-login text-3xl mb-2"></i>
              <p className="text-sm">No sessions found</p>
            </div>
          ) : (
            sessions.map(s => (
              <div key={s._id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 items-center px-5 py-3 border-b border-white/5 hover:bg-white/5 transition">
                <span className="text-xs font-mono text-white/40 truncate" title={s.sessionId}>{s.sessionId?.slice(0, 18)}…</span>
                <span className="text-xs text-white/60">{s.loginAt ? new Date(s.loginAt).toLocaleString() : '—'}</span>
                <span className="text-xs text-white/60">{s.logoutAt ? new Date(s.logoutAt).toLocaleString() : '—'}</span>
                <span className="text-xs text-white/60">{formatDuration(s.duration)}</span>
                <span className={`text-xs font-medium ${s.isActive ? 'text-green-400' : 'text-white/30'}`}>
                  {s.isActive ? '● Active' : s.logoutType || 'Ended'}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
