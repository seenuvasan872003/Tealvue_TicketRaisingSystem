import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonRow = ({ cols = 5 }) => (
  <div className="animate-pulse flex items-center gap-4 p-4 border-b border-white/5">
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="h-3 bg-white/10 rounded" style={{ flex: i === 0 ? 2.5 : 1 }}></div>
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

export default function UserActivityDetails() {
  const { uid }  = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const role     = user?.role;
  const prefix   = role === 'super-admin' ? 'super-admin' : role === 'admin' ? 'admin' : 'team-admin';
  const BASE     = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/${prefix}/user-activity`;
  const headers  = { Authorization: `Bearer ${token}` };

  const [tab,       setTab]       = useState('warning_logs'); // Tabs: warning_logs, error_logs, sessions
  const [profile,   setProfile]   = useState(null);
  const [summary,   setSummary]   = useState(null);
  const [logs,      setLogs]      = useState([]);
  const [sessions,  setSessions]  = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage,  setLogsPage]  = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [sessLoading, setSessLoading] = useState(false);

  // Load profile summary
  const loadSummary = useCallback(async () => {
    try {
      const sumRes = await axios.get(`${BASE}/${uid}/summary`, { headers });
      setSummary(sumRes.data.summary);
      setProfile(sumRes.data.user);
    } catch (_) {}
    setLoading(false);
  }, [uid, BASE]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Fetch logs
  const fetchLogs = useCallback(async (p = 1) => {
    setLogsLoading(true);
    try {
      const params = { page: p, limit: 100 };
      const res = await axios.get(`${BASE}/${uid}`, { headers, params });
      
      let filteredLogs = res.data.logs || [];
      
      if (tab === 'warning_logs') {
        // Warning Logs -> Only show warning logs (statusCode >= 300 and statusCode < 400)
        filteredLogs = filteredLogs.filter(log => 
          log.details?.statusCode && log.details.statusCode >= 300 && log.details.statusCode < 400
        );
      } else if (tab === 'error_logs') {
        // Error Logs -> Show only errors (statusCode >= 400 or failed logins/unauth)
        filteredLogs = filteredLogs.filter(log => 
          log.eventType === 'FAILED_LOGIN' || 
          log.eventType === 'UNAUTHORIZED_ATTEMPT' || 
          (log.details?.statusCode && log.details.statusCode >= 400)
        );
      }

      setLogs(filteredLogs);
      setLogsTotal(filteredLogs.length);
      setLogsPage(p);
    } catch (_) {}
    setLogsLoading(false);
  }, [uid, tab, BASE]);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    setSessLoading(true);
    try {
      const res = await axios.get(`${BASE}/${uid}/sessions`, { headers });
      setSessions(res.data.sessions || []);
    } catch (_) {}
    setSessLoading(false);
  }, [uid, BASE]);

  useEffect(() => {
    if (tab === 'sessions') {
      fetchSessions();
    } else {
      fetchLogs(1);
    }
  }, [tab, fetchLogs, fetchSessions]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDurationText = (s) => {
    const loginT = formatTime(s.loginAt);
    const logoutT = s.logoutAt ? formatTime(s.logoutAt) : 'Present';
    if (!s.logoutAt) {
      return `Active: ${loginT} - ${logoutT}`;
    }
    const diff = Math.round((new Date(s.logoutAt) - new Date(s.loginAt)) / 1000);
    const m = Math.floor(diff / 60);
    const durationStr = m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
    return `Active: ${loginT} - ${logoutT} (${durationStr})`;
  };

  return (
    <div className="min-h-screen text-white px-4 py-6 md:px-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-teal-300 transition-colors"
      >
        <i className="ti-arrow-left"></i> Back to list
      </button>

      {/* Profile Header */}
      {loading ? <SkeletonProfile /> : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
          <Avatar name={profile?.name} avatar={profile?.avatar} size="lg" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white tracking-wide">{profile?.name}</h2>
            <p className="text-sm text-white/40">{profile?.email}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {profile?.role?.replace('-', ' ').replace('_', ' ')}
              </span>
              <span className="text-xs text-white/30 self-center">
                Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
          {/* Mini stats */}
          <div className="flex gap-8 text-center bg-white/5 rounded-2xl p-4 border border-white/5">
            {[
              ['Logins',   summary?.totalLogins],
              ['Triggers', summary?.totalTriggers],
              ['Last Active', summary?.lastActiveAt ? new Date(summary.lastActiveAt).toLocaleTimeString() : '—']
            ].map(([l, v]) => (
              <div key={l} className="min-w-[80px]">
                <p className="text-xl font-bold text-teal-400">{v ?? 0}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs / Log Segments */}
      <div className="flex flex-wrap gap-1.5 bg-white/5 border border-white/5 rounded-xl p-1 w-fit">
        {[
          { id: 'warning_logs', label: 'Warning Logs', icon: 'ti-alert' },
          { id: 'error_logs',    label: 'Error Logs',    icon: 'ti-close' },
          { id: 'sessions',      label: 'Sessions',      icon: 'ti-login' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              tab === t.id
                ? 'bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)]'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <i className={`${t.icon} text-sm`}></i>
            {t.label}
          </button>
        ))}
      </div>

      {/* Logs / Sessions table content */}
      {tab !== 'sessions' ? (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[2.5fr_1fr_1.5fr_1.5fr_1fr] gap-4 px-6 py-4 border-b border-white/10 text-xs font-bold text-white/40 uppercase tracking-wider">
            <span>Requested Endpoint</span>
            <span>Method</span>
            <span>Event Type</span>
            <span>Timestamp</span>
            <span>Status</span>
          </div>

          {logsLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-white/30">
              <i className="ti-face-sad text-4xl mb-3 text-white/20"></i>
              <p className="text-sm">No logs recorded under this category</p>
            </div>
          ) : (
            logs.map(log => {
              const isError = log.details?.statusCode >= 400 || log.eventType === 'FAILED_LOGIN' || log.eventType === 'UNAUTHORIZED_ATTEMPT';
              return (
                <div
                  key={log._id}
                  className="grid grid-cols-1 md:grid-cols-[2.5fr_1fr_1.5fr_1.5fr_1fr] gap-4 items-center px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-all duration-200"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-mono text-white/70 block truncate" title={log.details?.route}>
                      {log.details?.route || '—'}
                    </span>
                    {log.details?.note && (
                      <span className="text-[10px] text-white/30 block mt-0.5 truncate">{log.details.note}</span>
                    )}
                  </div>
                  <div>
                    <MethodBadge method={log.details?.method} />
                  </div>
                  <div>
                    <EventBadge type={log.eventType} />
                  </div>
                  <div className="text-xs text-white/40">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                  <div>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      isError ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                    }`}>
                      {log.details?.statusCode ?? '200'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[1.5fr_1.2fr_1fr_1.5fr_1.5fr_0.8fr_2.5fr_1fr] gap-4 px-6 py-4 border-b border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-wider">
            <span>Session ID</span>
            <span>User Name</span>
            <span>Role</span>
            <span>Login Time</span>
            <span>Logout Time</span>
            <span>Log Count</span>
            <span>Duration (Active window)</span>
            <span>Status</span>
          </div>

          {sessLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-white/30">
              <i className="ti-info-alt text-4xl mb-3 text-white/20"></i>
              <p className="text-sm">No session logs found for this user</p>
            </div>
          ) : (
            sessions.map(s => (
              <div
                key={s._id}
                className="grid grid-cols-1 md:grid-cols-[1.5fr_1.2fr_1fr_1.5fr_1.5fr_0.8fr_2.5fr_1fr] gap-4 items-center px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-all duration-200"
              >
                <span className="text-xs font-mono text-white/50 truncate" title={s.sessionId}>
                  {s.sessionId?.slice(0, 8)}...
                </span>
                <span className="text-xs text-white/70 truncate">{s.userName || profile?.name}</span>
                <span className="text-xs text-white/50">{s.userRole?.replace('_', ' ').replace('-', ' ')}</span>
                <span className="text-xs text-white/70">{s.loginAt ? new Date(s.loginAt).toLocaleString() : '—'}</span>
                <span className="text-xs text-white/70">{s.logoutAt ? new Date(s.logoutAt).toLocaleString() : '—'}</span>
                <span className="text-xs text-white/80 font-bold text-center md:text-left">{s.pageLogCount ?? 0}</span>
                <span className="text-xs text-teal-400 font-medium truncate" title={formatDurationText(s)}>
                  {formatDurationText(s)}
                </span>
                <div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    s.isActive 
                      ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                      : 'bg-white/10 text-white/40 border-white/20'
                  }`}>
                    {s.isActive ? 'Active' : s.logoutType || 'Ended'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
