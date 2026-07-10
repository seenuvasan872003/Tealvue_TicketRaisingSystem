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
  'super-admin': { label: 'Super Admin', textCls: 'text-amber-400', bgCls: 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent', borderCls: 'border-amber-500/30', borderHoverCls: 'border-amber-500/50', avatarBgCls: 'bg-gradient-to-br from-amber-600 to-orange-700', avatarBorderCls: 'border-amber-500/30', badgeBgCls: 'bg-amber-500/15', Icon: Crown, barBgCls: 'bg-amber-400' },
  'admin':       { label: 'Admin',       textCls: 'text-teal-400',  bgCls: 'bg-gradient-to-br from-teal-500/20 via-teal-500/10 to-transparent', borderCls: 'border-teal-500/30', borderHoverCls: 'border-teal-500/50', avatarBgCls: 'bg-gradient-to-br from-teal-600 to-teal-700', avatarBorderCls: 'border-teal-500/30', badgeBgCls: 'bg-teal-500/15', Icon: ShieldCheck, barBgCls: 'bg-teal-400' },
  'team_admin':  { label: 'Team Admin',  textCls: 'text-cyan-400',  bgCls: 'bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-transparent', borderCls: 'border-cyan-500/30', borderHoverCls: 'border-cyan-500/50', avatarBgCls: 'bg-gradient-to-br from-cyan-600 to-cyan-700', avatarBorderCls: 'border-cyan-500/30', badgeBgCls: 'bg-cyan-500/15', Icon: ShieldCheck, barBgCls: 'bg-cyan-400' },
  'team_user':   { label: 'Team Agent',  textCls: 'text-blue-400',  bgCls: 'bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent', borderCls: 'border-blue-500/30', borderHoverCls: 'border-blue-500/50', avatarBgCls: 'bg-gradient-to-br from-blue-600 to-blue-700', avatarBorderCls: 'border-blue-500/30', badgeBgCls: 'bg-blue-500/15', Icon: User, barBgCls: 'bg-blue-400' },
  'user':        { label: 'User',        textCls: 'text-slate-400', bgCls: 'bg-gradient-to-br from-slate-500/20 via-slate-500/10 to-transparent', borderCls: 'border-slate-500/30', borderHoverCls: 'border-slate-500/50', avatarBgCls: 'bg-gradient-to-br from-slate-600 to-slate-700', avatarBorderCls: 'border-slate-500/30', badgeBgCls: 'bg-slate-500/15', Icon: User, barBgCls: 'bg-slate-400' },
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
      const apiPath = getFeatureApiPath('features_management', activeRole);
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

  const [visibleCount, setVisibleCount] = useState(10);

  const handleBulkReset = async () => {
    const ok = await confirm(
      `Reset all [${meta.label}] users to default features?\nThis will replace all custom feature assignments for ${meta.label} role.`,
      'Reset to Defaults'
    );
    if (!ok) return;
    setBulkLoading(true);
    try {
      const activeRole = localStorage.getItem('user_role') || 'super-admin';
      const apiPath = getFeatureApiPath('features_management', activeRole);
      const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
      await API.put(`${relativePath}/reset-role`, { role });
      toast.success(`All ${meta.label} accounts reset to defaults!`);
      // Notify parent to refetch
      onSaved && onSaved(role);
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
        {users.slice(0, visibleCount).map(user => (
          <UserCard
            key={user.userId}
            userRecord={user}
            currentUserId={currentUserId}
            onSaved={onSaved}
          />
        ))}
        {users.length > visibleCount && (
          <button
            onClick={() => setVisibleCount(v => v + 20)}
            className="w-full mt-2 py-2.5 rounded-xl border border-white/[0.08] text-[12px] font-semibold text-[var(--color-text-muted)] hover:bg-white/[0.02] hover:text-white transition-colors cursor-pointer"
          >
            Load More Users ({users.length - visibleCount} remaining)
          </button>
        )}
      </div>
    </div>
  );
};

import { getCache, setCache } from '../utils/cache';

// ── Main Page ──────────────────────────────────────────────
const FeaturesManagement = () => {
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

  // Bulk Feature Assignment State
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [selectedRoles, setSelectedRoles]       = useState([]);
  const [applying, setApplying]                 = useState(false);
  const [previewCount, setPreviewCount]         = useState(0);

  const toggleRole = (role) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const removeFeature = (featId) => {
    setSelectedFeatures(prev => {
      const next = prev.filter(id => id !== featId);
      if (next.length === 0) setSelectedRoles([]);
      return next;
    });
  };

  const fetchPreviewCount = async (featureIds, rolesArray) => {
    if (featureIds.length === 0 || rolesArray.length === 0) {
      setPreviewCount(0);
      return;
    }
    try {
      const featuresParam = featureIds.join(',');
      const rolesParam = rolesArray.join(',');
      const apiPath = getFeatureApiPath('features_management', currentUser?.role);
      const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
      const { data } = await API.get(`${relativePath}/preview-count?featureIds=${featuresParam}&roles=${rolesParam}`);
      setPreviewCount(data.count || 0);
    } catch (err) {
      console.error('Failed to fetch preview count:', err);
    }
  };

  useEffect(() => {
    if (selectedFeatures.length > 0 && selectedRoles.length > 0) {
      fetchPreviewCount(selectedFeatures, selectedRoles);
    } else {
      setPreviewCount(0);
    }
  }, [selectedFeatures, selectedRoles]);

  const handleAssignToRoles = async () => {
    if (selectedFeatures.length === 0 || selectedRoles.length === 0) return;
    setApplying(true);
    try {
      const apiPath = getFeatureApiPath('features_management', currentUser?.role);
      const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
      const { data } = await API.put(`${relativePath}/assign-to-roles`, {
        featureIds: selectedFeatures,
        roles: selectedRoles,
      });
      toast.success(data.message || `Features successfully assigned to ${data.count} users`);
      setSelectedFeatures([]);
      setSelectedRoles([]);
      setRefetchKey(k => k + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign features to roles');
    } finally {
      setApplying(false);
    }
  };

  const handleRemoveFromRoles = async () => {
    if (selectedFeatures.length === 0 || selectedRoles.length === 0) return;
    const ok = window.confirm(`Are you sure you want to bulk remove ${selectedFeatures.length} feature(s) from all users of selected roles?`);
    if (!ok) return;
    setApplying(true);
    try {
      const apiPath = getFeatureApiPath('features_management', currentUser?.role);
      const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
      const { data } = await API.put(`${relativePath}/remove-from-roles`, {
        featureIds: selectedFeatures,
        roles: selectedRoles,
      });
      if (data.warning) {
        toast.warning(data.warning);
      }
      toast.success(data.message || 'Features successfully removed from roles');
      setSelectedFeatures([]);
      setSelectedRoles([]);
      setRefetchKey(k => k + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove features from roles');
    } finally {
      setApplying(false);
    }
  };

  const handleResetRole = async (role) => {
    const ok = window.confirm(
      `Reset all [${ROLE_META[role]?.label || role}] users to default features?\nThis will replace all custom feature assignments for ${ROLE_META[role]?.label || role} role.`
    );
    if (!ok) return;
    try {
      const apiPath = getFeatureApiPath('features_management', currentUser?.role);
      const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
      await API.put(`${relativePath}/reset-role`, { role });
      toast.success(`Features reset to defaults for role: ${role}`);
      setRefetchKey(k => k + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset role features');
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      const cached = getCache('role_features_all');
      if (!Array.isArray(cached) || cached.length === 0) {
        setLoading(true);
      }
      try {
        const apiPath = getFeatureApiPath('features_management', currentUser?.role);
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

  const groupedFeatures = useMemo(() => {
    return FEATURES.reduce((acc, f) => {
      if (!acc[f.section]) acc[f.section] = [];
      acc[f.section].push(f);
      return acc;
    }, {});
  }, []);

  const eligibleRoles = useMemo(() => {
    if (selectedFeatures.length === 0) return [];
    let commonRoles = FEATURES.find(f => f.id === selectedFeatures[0])?.roles || [];
    for (let i = 1; i < selectedFeatures.length; i++) {
      const featureRoles = FEATURES.find(f => f.id === selectedFeatures[i])?.roles || [];
      commonRoles = commonRoles.filter(r => featureRoles.includes(r));
    }
    return commonRoles;
  }, [selectedFeatures]);

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

      {/* ── Section 1 — Role-Based Feature Assignment ── */}
      <div className="mb-8 relative overflow-hidden rounded-2xl border border-white/[0.06] shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
        style={{ background: 'linear-gradient(145deg, #0f1117 0%, #13161f 60%, #0d1016 100%)' }}
      >
        {/* Decorative glow blobs */}
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-[0.06] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #d3a73c 0%, transparent 70%)' }} />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full opacity-[0.04] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #14b8a6 0%, transparent 70%)' }} />

        <div className="relative z-10 p-6 sm:p-8">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4 mb-7">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #d3a73c22 0%, #d3a73c44 100%)', border: '1px solid #d3a73c33' }}>
                <ShieldCheck className="text-[#d3a73c]" size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="m-0 text-[15px] font-bold text-white tracking-tight">Assign Feature to Role</h3>
                <p className="m-0 text-[12px] text-[var(--color-text-muted)] mt-0.5">Bulk-assign or remove a feature across all users of selected roles</p>
              </div>
            </div>
            {/* Live badge */}
            {selectedFeatures.length > 0 && selectedRoles.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
                style={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.25)', color: '#14b8a6' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] animate-pulse" />
                {previewCount > 0 ? `${previewCount} users affected` : 'Ready to apply'}
              </div>
            )}
          </div>

          {/* ── Step Layout ── */}
          <div className="flex flex-col gap-6">

            {/* STEP 1 — Feature */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #d3a73c, #a87f1c)', color: '#000' }}>1</span>
                  <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Select Features</span>
                </div>
                {selectedFeatures.length > 0 && (
                  <button onClick={() => { setSelectedFeatures([]); setSelectedRoles([]); }} className="text-[11px] font-semibold text-[#ef4444] hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none">
                    Clear All
                  </button>
                )}
              </div>

              {/* Custom styled select */}
              <div className="relative">
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !selectedFeatures.includes(val)) {
                      setSelectedFeatures(prev => [...prev, val]);
                      setSelectedRoles([]); // Reset role selections to force re-evaluation
                    }
                  }}
                  className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl text-[13px] font-medium outline-none cursor-pointer transition-all duration-200"
                  style={{
                    background: selectedFeatures.length > 0 ? 'rgba(211,167,60,0.08)' : 'rgba(255,255,255,0.04)',
                    border: selectedFeatures.length > 0 ? '1px solid rgba(211,167,60,0.35)' : '1px solid rgba(255,255,255,0.1)',
                    color: selectedFeatures.length > 0 ? '#fff' : '#666',
                  }}
                >
                  <option value="" style={{ background: '#13161f', color: '#888' }}>— Add a feature —</option>
                  {Object.keys(groupedFeatures).map(sec => (
                    <optgroup key={sec} label={`── ${sec} ──`} style={{ background: '#13161f', color: '#555', fontWeight: 700 }}>
                      {groupedFeatures[sec].map(f => {
                        const isSelected = selectedFeatures.includes(f.id);
                        return (
                          <option key={f.id} value={f.id} disabled={isSelected} style={{ background: '#13161f', color: isSelected ? '#555' : '#e2e8f0', fontWeight: 400 }}>
                            {f.label} {isSelected ? '(Selected)' : ''}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
                <i className="ti ti-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#555] text-sm pointer-events-none" />
              </div>

              {/* Selected feature pills */}
              {selectedFeatures.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2">
                  {selectedFeatures.map(featId => {
                    const feat = FEATURES.find(f => f.id === featId);
                    if (!feat) return null;
                    return (
                      <div key={featId} className="flex items-center gap-3 pl-3 pr-8 py-2 rounded-lg relative group transition-all"
                        style={{ background: 'rgba(211,167,60,0.08)', border: '1px solid rgba(211,167,60,0.2)' }}>
                        <div className="flex items-center gap-2">
                          <i className={`ti ${feat.icon} text-[#d3a73c] text-[15px]`} />
                          <div>
                            <div className="text-[13px] font-bold text-[#d3a73c] leading-tight">{feat.label}</div>
                            <div className="text-[10px] text-[#666] uppercase tracking-wider">{feat.section} · {feat.id}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFeature(featId)}
                          title="Remove feature"
                          style={{
                            position: 'absolute',
                            top: '50%',
                            right: '8px',
                            transform: 'translateY(-50%)',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.4)',
                            borderRadius: '4px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '14px',
                            fontWeight: '900',
                            lineHeight: 1,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.35)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/[0.06]" />

            {/* STEP 2 — Roles */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0"
                  style={{ background: selectedFeatures.length > 0 ? 'linear-gradient(135deg, #d3a73c, #a87f1c)' : '#222', color: selectedFeatures.length > 0 ? '#000' : '#555' }}>2</span>
                <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Select Roles</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'super-admin', label: 'Super Admin', color: '#f59e0b', icon: 'ti-crown' },
                  { id: 'admin',       label: 'Admin',       color: '#14b8a6', icon: 'ti-shield-check' },
                  { id: 'team_admin',  label: 'Team Admin',  color: '#818cf8', icon: 'ti-shield-half' },
                  { id: 'team_user',   label: 'Team Agent',  color: '#60a5fa', icon: 'ti-headset' },
                  { id: 'user',        label: 'User',        color: '#94a3b8', icon: 'ti-user' },
                ].map(roleItem => {
                  // A role is eligible if:
                  // 1. It is allowed statically by FEATURES config
                  // 2. AND there's at least one user in that role who doesn't have ALL the selected features yet
                  const isAllowedByConfig = selectedFeatures.length === 0 || eligibleRoles.includes(roleItem.id);
                  const roleUsers = allUsers.filter(u => u.role === roleItem.id);
                  const hasEligibleUser = selectedFeatures.length === 0 || (roleUsers.length > 0 && roleUsers.some(u => {
                    const uFeats = u.features || [];
                    return selectedFeatures.some(fId => !uFeats.includes(fId));
                  }));

                  const isEligible = isAllowedByConfig && hasEligibleUser;
                  const isChecked = selectedRoles.includes(roleItem.id);
                  return (
                    <button
                      key={roleItem.id}
                      type="button"
                      disabled={!isEligible || selectedFeatures.length === 0}
                      onClick={() => isEligible && selectedFeatures.length > 0 && toggleRole(roleItem.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 select-none"
                      style={{
                        background: isChecked
                          ? `${roleItem.color}22`
                          : isEligible && selectedFeatures.length > 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                        border: isChecked
                          ? `1px solid ${roleItem.color}55`
                          : isEligible && selectedFeatures.length > 0 ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.03)',
                        color: isChecked ? roleItem.color : (isEligible && selectedFeatures.length > 0) ? '#888' : '#333',
                        cursor: (isEligible && selectedFeatures.length > 0) ? 'pointer' : 'not-allowed',
                        opacity: (isEligible && selectedFeatures.length > 0) ? 1 : 0.35,
                        boxShadow: isChecked ? `0 0 12px ${roleItem.color}22` : 'none',
                        transform: isChecked ? 'scale(1.03)' : 'scale(1)',
                      }}
                      title={isChecked ? "Remove role" : (isEligible ? "Select role" : "Role already has these features or is not eligible")}
                    >
                      <i className={`ti ${roleItem.icon} text-[13px]`} />
                      {roleItem.label}
                      {isChecked && <i className="ti ti-x text-[12px] ml-0.5" style={{ color: '#ef4444' }} />}
                    </button>
                  );
                })}
              </div>

              {selectedRoles.length > 0 && (
                <div className="text-[11px] text-[#555] mt-1">
                  {selectedRoles.length} role{selectedRoles.length > 1 ? 's' : ''} selected
                </div>
              )}

              {selectedFeatures.length > 0 && selectedRoles.length === 0 && (
                <div className="text-[11px] text-[#555] flex items-center gap-1.5 mt-1">
                  <i className="ti ti-info-circle text-[13px]" /> Click roles above to select
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/[0.06]" />

            {/* STEP 3 — Action */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0"
                  style={{ background: (selectedFeatures.length > 0 && selectedRoles.length > 0) ? 'linear-gradient(135deg, #d3a73c, #a87f1c)' : '#222', color: (selectedFeatures.length > 0 && selectedRoles.length > 0) ? '#000' : '#555' }}>3</span>
                <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Apply</span>
              </div>

              {/* Preview Banner */}
              {selectedFeatures.length > 0 && selectedRoles.length > 0 ? (
                <div className="rounded-xl p-3 mb-1"
                  style={{ background: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.18)' }}>
                  <div className="text-[11px] text-[#94a3b8] leading-relaxed">
                    <span className="font-semibold text-white">{selectedFeatures.length} feature(s)</span>{' '}
                    will be applied to{' '}
                    <span className="text-[#14b8a6] font-semibold">
                      {selectedRoles.map(r => ROLE_META[r]?.label || r).join(', ')}
                    </span>
                  </div>
                  {previewCount > 0 && (
                    <div className="text-[11px] text-[#14b8a6] font-bold mt-1.5 flex items-center gap-1">
                      <i className="ti ti-users text-[12px]" />
                      {previewCount} users will receive {selectedFeatures.length === 1 ? 'this feature' : 'features'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl p-3 mb-1" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                  <div className="text-[11px] text-[#444] text-center">
                    Select features and roles<br />to see the preview
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleAssignToRoles}
                  disabled={applying || selectedFeatures.length === 0 || selectedRoles.length === 0}
                  className="w-full flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[13px] font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: (applying || selectedFeatures.length === 0 || selectedRoles.length === 0)
                      ? 'rgba(211,167,60,0.15)'
                      : 'linear-gradient(135deg, #d3a73c 0%, #c49528 50%, #a87f1c 100%)',
                    color: '#000',
                    boxShadow: (!applying && selectedFeatures.length > 0 && selectedRoles.length > 0)
                      ? '0 4px 20px rgba(211,167,60,0.35)' : 'none',
                    cursor: (applying || selectedFeatures.length === 0 || selectedRoles.length === 0) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {applying ? (
                    <><i className="ti ti-loader-2 animate-spin text-[14px]" /> Applying...</>
                  ) : (
                    <><i className="ti ti-circle-plus text-[14px]" /> Apply to Selected Roles</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRemoveFromRoles}
                  disabled={applying || selectedFeatures.length === 0 || selectedRoles.length === 0}
                  className="w-full flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[13px] font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: (!applying && selectedFeatures.length > 0 && selectedRoles.length > 0) ? '#ef4444' : '#555',
                    cursor: (applying || selectedFeatures.length === 0 || selectedRoles.length === 0) ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!applying && selectedFeatures.length > 0 && selectedRoles.length > 0) {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                    }
                  }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {applying ? (
                    <><i className="ti ti-loader-2 animate-spin text-[14px]" /> Removing...</>
                  ) : (
                    <><i className="ti ti-circle-minus text-[14px]" /> Remove from Roles</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
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
            onClick={() => {
              invalidateCache('role_features_all');
              invalidateCache('role_features');
              setRefetchKey(k => k + 1);
            }}
            className="text-[12.5px] h-[42px] px-[18px] rounded-xl border border-[var(--color-border)] flex items-center justify-center cursor-pointer transition-colors duration-200 hover:border-[var(--color-teal)] hover:text-[var(--color-teal)]"
          >
            <RefreshCw size={13} className="mr-1.5" /> Refresh List
          </button>
        </div>

        {/* ── Modern Role Select Dropdown Filter ── */}
        <div className="flex gap-2 items-center bg-[var(--color-surface)] border border-[var(--color-border)] px-3 rounded-xl h-[42px] text-[13px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#888] whitespace-nowrap">Role Filter:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-transparent border-none text-white outline-none font-semibold text-xs cursor-pointer h-full pr-2"
          >
            <option value="all" className="bg-[#111] text-white">All Roles ({allUsers.length})</option>
            <option value="super-admin" className="bg-[#111] text-white">Super Admin ({allUsers.filter(u => u.role === 'super-admin').length})</option>
            <option value="admin" className="bg-[#111] text-white">Admin ({allUsers.filter(u => u.role === 'admin').length})</option>
            <option value="team_admin" className="bg-[#111] text-white">Team Admin ({allUsers.filter(u => u.role === 'team_admin').length})</option>
            <option value="team_user" className="bg-[#111] text-white">Team Agent ({allUsers.filter(u => u.role === 'team_user').length})</option>
            <option value="user" className="bg-[#111] text-white">User ({allUsers.filter(u => u.role === 'user').length})</option>
          </select>
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

export default FeaturesManagement;
