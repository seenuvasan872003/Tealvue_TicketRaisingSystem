// ============================================================
//  client/src/pages/RolesFeatures.jsx
// ============================================================
//  Super Admin — full Roles & Features management page.
//  Groups users by role, each user card expandable to show
//  FeatureChecklist with live dirty tracking.
// ============================================================

import { useEffect, useState, useMemo } from 'react';
import {
  Search, ChevronDown, ChevronUp, Crown, ShieldCheck,
  User, Users, RefreshCw, Layers, Filter, AlertCircle, ShieldAlert, Unlock
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/authApi';
import FeatureChecklist from '../components/FeatureChecklist';
import { useAuth } from '../context/AuthContext';
import { invalidateCache } from '../utils/cache';
import { SkeletonCard } from '../components/skeletons';
import { FEATURES } from '../config/featureList';
import { ROLE_DEFAULTS } from '../config/roleDefaults';
import { getFeatureApiPath } from '../config/featureHelpers';
import { useConfirm } from '../context/ConfirmContext';

const TOTAL_FEATURES = FEATURES.length;

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ── Role styling ───────────────────────────────────────────
const ROLE_META = {
  'super-admin': { label: 'Super Admin', textCls: 'text-[#f59e0b]', bgCls: 'bg-[rgba(245,158,11,0.12)]', borderCls: 'border-[#f59e0b]/20', borderHoverCls: 'border-[#f59e0b]/40', avatarBgCls: 'bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/40', avatarBorderCls: 'border-[#f59e0b]/25', badgeBgCls: 'bg-[#f59e0b]/10', Icon: Crown, barBgCls: 'bg-[#f59e0b]' },
  'admin':       { label: 'Admin',       textCls: 'text-[#14b8a6]', bgCls: 'bg-[rgba(20,184,166,0.12)]', borderCls: 'border-[#14b8a6]/20', borderHoverCls: 'border-[#14b8a6]/40', avatarBgCls: 'bg-gradient-to-br from-[#14b8a6]/20 to-[#14b8a6]/40', avatarBorderCls: 'border-[#14b8a6]/25', badgeBgCls: 'bg-[#14b8a6]/10', Icon: ShieldCheck, barBgCls: 'bg-[#14b8a6]' },
  'user':        { label: 'User',        textCls: 'text-[#94a3b8]', bgCls: 'bg-[rgba(148,163,184,0.12)]', borderCls: 'border-[#94a3b8]/20', borderHoverCls: 'border-[#94a3b8]/40', avatarBgCls: 'bg-gradient-to-br from-[#94a3b8]/20 to-[#94a3b8]/40', avatarBorderCls: 'border-[#94a3b8]/25', badgeBgCls: 'bg-[#94a3b8]/10', Icon: User, barBgCls: 'bg-[#94a3b8]' },
  'team_admin':  { label: 'Team Admin',  textCls: 'text-[#818cf8]', bgCls: 'bg-[rgba(129,140,248,0.12)]', borderCls: 'border-[#818cf8]/20', borderHoverCls: 'border-[#818cf8]/40', avatarBgCls: 'bg-gradient-to-br from-[#818cf8]/20 to-[#818cf8]/40', avatarBorderCls: 'border-[#818cf8]/25', badgeBgCls: 'bg-[#818cf8]/10', Icon: ShieldCheck, barBgCls: 'bg-[#818cf8]' },
  'team_user':   { label: 'Team Agent',  textCls: 'text-[#60a5fa]', bgCls: 'bg-[rgba(96,165,250,0.12)]', borderCls: 'border-[#60a5fa]/20', borderHoverCls: 'border-[#60a5fa]/40', avatarBgCls: 'bg-gradient-to-br from-[#60a5fa]/20 to-[#60a5fa]/40', avatarBorderCls: 'border-[#60a5fa]/25', badgeBgCls: 'bg-[#60a5fa]/10', Icon: User, barBgCls: 'bg-[#60a5fa]' },
};

const ROLE_ORDER = ['super-admin', 'admin', 'team_admin', 'team_user', 'user'];

// ── User Avatar ────────────────────────────────────────────
const UserAvatar = ({ user }) => {
  const [imgError, setImgError] = useState(false);
  if (user.avatar && !imgError) {
    return (
      <img
        src={`${BASE_URL}${user.avatar}`}
        alt={user.name}
        onError={() => setImgError(true)}
        className="w-[38px] h-[38px] rounded-full object-cover border-2 border-[var(--color-border)] shrink-0"
      />
    );
  }
  const meta = ROLE_META[user.role] || ROLE_META['user'];
  return (
    <div className={`w-[38px] h-[38px] rounded-full shrink-0 flex items-center justify-center text-white text-[15px] font-bold border-2 ${meta.avatarBgCls} ${meta.avatarBorderCls}`}>
      {user.name?.[0]?.toUpperCase()}
    </div>
  );
};

// ── User Card ──────────────────────────────────────────────
const UserCard = ({ userRecord, currentUserId, onSaved }) => {
  const confirm = useConfirm();
  const [expanded, setExpanded] = useState(false);
  const [localFeatures, setLocalFeatures] = useState(userRecord.features || []);
  const [unblocking, setUnblocking] = useState(false);
  const [flags, setFlags] = useState(userRecord.securityFlags || 0);

  const meta         = ROLE_META[userRecord.role] || ROLE_META['user'];
  const enabledCount = localFeatures.filter(fId => FEATURES.some(f => f.id === fId)).length;
  const pct          = Math.round((enabledCount / TOTAL_FEATURES) * 100);

  const barColorCls = pct > 80 ? 'bg-[#10b981]' : pct > 40 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]';

  const handleSaved = (newFeatures) => {
    setLocalFeatures(newFeatures);
    onSaved && onSaved(userRecord.userId, newFeatures);
  };

  const handleUnblock = async () => {
    const ok = await confirm(`Clear security flags for ${userRecord.name}?`, 'Clear Flags');
    if (!ok) return;
    setUnblocking(true);
    try {
      const activeRole = localStorage.getItem('user_role') || 'super-admin';
      const apiPath = getFeatureApiPath('roles_features', activeRole);
      const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
      
      await API.put(`${relativePath}/unblock/${userRecord.userId}`);
      toast.success('Security flags cleared successfully');
      setFlags(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear security flags');
    } finally {
      setUnblocking(false);
    }
  };

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden transition-colors duration-200">
      {/* Card Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        className={`flex flex-col sm:flex-row sm:items-center sm:gap-[14px] px-4 py-3 sm:px-[18px] sm:py-[14px] cursor-pointer transition-colors duration-200 ${expanded ? "bg-[rgba(20,184,166,0.04)]" : "bg-[var(--color-surface)]"}`}
      >
        {/* Row 1: Avatar + Name/Email + Chevron */}
        <div className="flex items-center gap-3 w-full sm:contents">
          <UserAvatar user={userRecord} />

          <div className="flex-1 overflow-hidden min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[var(--color-text)] text-[14px] truncate">
                {userRecord.name}
              </span>
              {userRecord.userId === currentUserId && (
                <span className="bg-[rgba(20,184,166,0.15)] text-[var(--color-teal)] border border-[rgba(20,184,166,0.3)] rounded-[20px] px-2 py-[1px] text-[10px] font-bold shrink-0">YOU</span>
              )}
              {flags >= 5 && (
                <span className="status-blocked inline-flex items-center gap-1 bg-[rgba(239,68,68,0.1)] text-[#ef4444] px-2 py-1 rounded-md text-[11px] border border-[rgba(239,68,68,0.2)]">
                  <ShieldAlert size={11} /> Blocked
                </span>
              )}
              {flags > 0 && flags < 5 && (
                <span className="status-blocked inline-flex items-center gap-1 bg-[rgba(239,68,68,0.1)] text-[#ef4444] px-2 py-1 rounded-md text-[11px] border border-[rgba(239,68,68,0.2)]">
                  <ShieldAlert size={11} /> Flags: {flags}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-[2px]">
              <div className="text-[12px] text-[var(--color-text-muted)] truncate">
                {userRecord.email}
              </div>
            </div>
          </div>

          {/* Clear Flags Button - placed between Name/Email and Progress Bar on desktop */}
          {flags > 0 && (
            <div className="mt-2 sm:mt-0 sm:mr-2 flex shrink-0">
              <button
                type="button"
                className="btn btn-secondary"
                className="btn btn-secondary px-3 py-1 text-[11px] h-7 inline-flex items-center gap-1 bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.25)] cursor-pointer z-10"
                onClick={(e) => { e.stopPropagation(); handleUnblock(); }}
                disabled={unblocking}
              >
                <Unlock size={11} /> {unblocking ? 'Clearing...' : 'Clear Flags'}
              </button>
            </div>
          )}

          {/* Chevron always on the right of row 1 */}
          <div className="sm:hidden text-[var(--color-text-muted)] shrink-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {/* Row 2 (mobile): Feature count badge + progress bar — full width below */}
        <div className="flex flex-col items-start mt-2.5 sm:mt-0 sm:items-end sm:min-w-[130px] sm:mr-3 sm:ml-auto w-full sm:w-auto">
          <div className={`inline-flex items-center gap-[5px] rounded-[20px] px-3 py-[3px] text-[11px] font-bold mb-1.5 border ${meta.bgCls} ${meta.textCls} ${meta.borderCls}`}>
            <Layers size={11} />
            {enabledCount} <span className="opacity-60 font-normal">/ {TOTAL_FEATURES}</span>
          </div>
          {/* Mini progress bar */}
          <div className="w-full sm:w-[120px] h-1.5 bg-[var(--color-border)] rounded-md overflow-hidden">
            <div className={`h-full rounded-md transition-all duration-300 ease-in-out ${meta.barBgCls || 'bg-[#10b981]'}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[10.5px] text-[var(--color-text-muted)] mt-1">
            {pct}% features enabled
          </div>
        </div>

        {/* Chevron desktop only — hidden on mobile since it's in row 1 */}
        <div className="hidden sm:block text-[var(--color-text-muted)] shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded Checklist */}
      {expanded && (
        <div className="px-[18px] pb-[18px]">
          <FeatureChecklist
            userId={userRecord.userId}
            role={userRecord.role}
            features={localFeatures}
            onSaved={handleSaved}
            onClose={() => setExpanded(false)}
            isSelf={userRecord.userId === currentUserId}
          />
        </div>
      )}
    </div>
  );
};

// ── Bulk Role Reset Section ────────────────────────────────
const RoleSection = ({ role, users, currentUserId, onSaved }) => {
  const confirm = useConfirm();
  const meta = ROLE_META[role] || ROLE_META['user'];
  const { Icon } = meta;
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkReset = async () => {
    const ok = await confirm(`Reset all ${meta.label} accounts to default features? This cannot be undone.`, 'Bulk Reset');
    if (!ok) return;
    setBulkLoading(true);
    try {
      const defaults = ROLE_DEFAULTS[role] || ['dashboard'];
      const activeRole = localStorage.getItem('user_role') || 'super-admin';
      const apiPath = getFeatureApiPath('roles_features', activeRole);
      const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
      await API.put(`${relativePath}/role/${role}`, { features: defaults });
      toast.success(`All ${meta.label} accounts reset to defaults!`);
      // Notify parent to refetch
      onSaved && onSaved(role, defaults);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk reset failed');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="mb-9">
      {/* Section Header */}
      <div className={`flex items-center justify-between flex-wrap sm:flex-nowrap gap-2 sm:gap-0 mb-[14px] px-4 py-[10px] rounded-[10px] border ${meta.bgCls} ${meta.borderCls}`}>
        <div className="flex items-center gap-[10px]">
          <Icon size={16} className={meta.textCls} />
          <span className={`font-bold text-[14px] ${meta.textCls}`}>{meta.label}</span>
          <span className={`rounded-[20px] px-[10px] py-[1px] text-[11px] font-bold border ${meta.badgeBgCls} ${meta.textCls} ${meta.borderCls}`}>
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </span>
        </div>

        <button
          onClick={handleBulkReset}
          disabled={bulkLoading}
          className={`bg-transparent cursor-pointer text-[11px] font-semibold px-3 py-1 rounded-lg flex items-center gap-[5px] transition-all duration-150 border ${meta.textCls} ${meta.borderHoverCls} ${bulkLoading ? 'opacity-50' : 'opacity-100'}`}
        >
          <RefreshCw size={11} />
          {bulkLoading ? 'Resetting...' : 'Reset all to defaults'}
        </button>
      </div>

      {/* User Cards */}
      <div className="flex flex-col gap-[10px]">
        {users.map(user => (
          <UserCard
            key={user.userId}
            userRecord={user}
            currentUserId={currentUserId}
            onSaved={onSaved}
          />
        ))}
      </div>
    </div>
  );
};

import { getCache, setCache } from '../utils/cache';

// ── Main Page ──────────────────────────────────────────────
const RolesFeatures = () => {
  const { user: currentUser } = useAuth();
  const [allUsers, setAllUsers]     = useState(() => {
    const cached = getCache('role_features_all');
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading]       = useState(() => {
    const cached = getCache('role_features_all');
    return !Array.isArray(cached);
  });
  const [search,  setSearch]        = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      const cached = getCache('role_features_all');
      if (!Array.isArray(cached) || cached.length === 0) {
        setLoading(true);
      }
      try {
        const apiPath = getFeatureApiPath('roles_features', currentUser?.role);
        const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
        const res = await API.get(relativePath);
        const fetched = res.data || [];
        setAllUsers(fetched);
        setCache('role_features_all', fetched, 30);
      } catch (err) {
        toast.error('Failed to load user features');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [refetchKey]);

  // ── Filters ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return allUsers.filter(u => {
      const matchSearch = !s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
      const matchRole   = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [allUsers, search, roleFilter]);

  // Group by role
  const grouped = useMemo(() => {
    const map = {};
    ROLE_ORDER.forEach(r => { map[r] = []; });
    filtered.forEach(u => {
      if (map[u.role]) map[u.role].push(u);
      else map[u.role] = [u];
    });
    return map;
  }, [filtered]);

  const handleSaved = (userIdOrRole, newFeatures) => {
    // Invalidate role features cache
    invalidateCache('role_features');
    invalidateCache('role_features_all');

    setAllUsers(prev => {
      // Single user save
      if (typeof userIdOrRole === 'string' && userIdOrRole.length === 24) {
        return prev.map(u => u.userId === userIdOrRole ? { ...u, features: newFeatures } : u);
      }
      // Bulk role reset
      const roleKey = userIdOrRole;
      return prev.map(u => u.role === roleKey ? { ...u, features: newFeatures } : u);
    });
  };

  const totalUsers   = allUsers.length;
  const uniqueRoles  = [...new Set(allUsers.map(u => u.role))].length;

  return (
    <div className="w-full max-w-[1100px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 overflow-hidden">

      {/* ── Page Header ────────────────────────────────── */}
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[var(--color-teal-dark)] to-[var(--color-teal)] flex items-center justify-center">
            <Layers size={20} color="#fff" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-[var(--color-text)] m-0">
              Roles & Features
            </h1>
            <p className="text-[12px] text-[var(--color-text-muted)] m-0">
              Control which features each user can access
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats Strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Total Users',    value: totalUsers,         color: 'var(--color-teal)',  sub: 'Registered accounts' },
          { label: 'Roles Active',   value: uniqueRoles,        color: '#f59e0b',            sub: 'Distinct configuration groups' },
          { label: 'Total Features', value: TOTAL_FEATURES,     color: '#818cf8',            sub: 'Permissions platform-wide' },
          { label: 'Avg Enabled',    value: allUsers.length > 0 ? Math.round(allUsers.reduce((s, u) => s + (u.features?.length || 0), 0) / allUsers.length) : 0, color: '#10b981', sub: 'Features per user' },
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl sm:rounded-2xl px-4 sm:px-6 py-4 sm:py-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col gap-1">
            <div className={`text-[32px] font-black leading-none tracking-tight text-[${stat.color}]`}>{stat.value}</div>
            <div>
              <div className="text-[13px] text-[var(--color-text)] font-bold">{stat.label}</div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-[2px]">{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sticky Filters & Controls Panel ── */}
      <div className="relative sm:sticky sm:top-4 z-40 sm:z-[100] bg-[#171c29f2] border border-[var(--color-border)] backdrop-blur-md rounded-2xl p-4 sm:p-5 mb-6 sm:mb-8 shadow-[0_12px_40px_rgba(0,0,0,0.4)] flex flex-col gap-4">
        <div className="flex gap-3 flex-wrap items-center">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-full sm:min-w-[260px]">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users by name or email address..."
              className="w-full bg-white/5 border border-[var(--color-border)] rounded-xl py-[11px] pl-4 pr-[44px] text-[13.5px] text-[var(--color-text)] outline-none box-border transition-all duration-200 focus:border-[var(--color-teal)]"
            />
            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => setRefetchKey(k => k + 1)}
            className="text-[12.5px] h-[42px] px-[18px] rounded-xl border border-[var(--color-border)] flex items-center justify-center cursor-pointer transition-colors duration-200 hover:border-[var(--color-teal)] hover:text-[var(--color-teal)]"
          >
            <RefreshCw size={13} className="mr-1.5" /> Refresh List
          </button>
        </div>

        {/* ── Modern Segmented Role Tab Switcher ── */}
        <div className="flex gap-1.5 bg-white/5 border border-[var(--color-border)] rounded-xl p-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {[
            { id: 'all', label: 'All Roles', count: allUsers.length },
            { id: 'super-admin', label: 'Super Admin', count: allUsers.filter(u => u.role === 'super-admin').length },
            { id: 'admin', label: 'Admin', count: allUsers.filter(u => u.role === 'admin').length },
            { id: 'team_admin', label: 'Team Admin', count: allUsers.filter(u => u.role === 'team_admin').length },
            { id: 'team_user', label: 'Team Agent', count: allUsers.filter(u => u.role === 'team_user').length },
            { id: 'user', label: 'User', count: allUsers.filter(u => u.role === 'user').length },
          ].map(tab => {
            const isTabActive = roleFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`border-none rounded-lg py-2 px-4 text-[13px] cursor-pointer inline-flex items-center gap-2 transition-all duration-200 outline-none ${isTabActive ? "bg-[rgba(20,184,166,0.12)] font-bold text-[var(--color-teal)]" : "bg-transparent font-medium text-[var(--color-text-muted)]"}`}
              >
                {tab.label}
                <span className={`text-[10px] rounded-[20px] px-2 py-[1px] font-bold ${isTabActive ? "bg-[rgba(20,184,166,0.2)] text-[var(--color-teal)]" : "bg-white/10 text-[var(--color-text-muted)]"}`}>{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col gap-[10px] mt-5">
          <SkeletonCard height="80px" />
          <SkeletonCard height="80px" />
          <SkeletonCard height="80px" />
          <SkeletonCard height="80px" />
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-[0_4px_24px_rgba(0,0,0,0.1)]">
          <AlertCircle size={36} color="var(--color-text-muted)" className="mx-auto mb-4" />
          <h3 className="m-0 mb-1.5 text-[var(--color-text)]">No accounts found</h3>
          <p className="text-[var(--color-text-muted)] text-[13.5px] m-0">
            {search ? 'Try adjusting your search criteria keywords' : 'No accounts mapped to this specific user role tab'}
          </p>
        </div>
      )}

      {/* ── Role Sections ───────────────────────────────── */}
      {!loading && ROLE_ORDER.map(role => {
        const users = grouped[role] || [];
        if (users.length === 0) return null;
        // Skip rendering other tabs' roles if roleFilter is active
        if (roleFilter !== 'all' && roleFilter !== role) return null;
        return (
          <RoleSection
            key={role}
            role={role}
            users={users}
            currentUserId={currentUser?._id}
            onSaved={handleSaved}
          />
        );
      })}
    </div>
  );
};

export default RolesFeatures;
