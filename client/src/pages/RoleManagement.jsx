import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  UserCog, Search, Check, X, AlertTriangle, Users,
  Crown, Shield, User, Users2, Headset, RefreshCw, ChevronDown, LayoutGrid, ToggleLeft, ShieldAlert
} from 'lucide-react';
import { FEATURES } from '../config/featureList';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const ROLES_ORDERED = ['super-admin', 'admin', 'user', 'team_admin', 'team_user'];
const SUPER_ADMIN_LOCKED = ['features_management', 'role_management'];

const ROLE_CONFIG = {
  'super-admin': {
    label: 'Super Admin',
    Icon: Crown,
    gradient: 'from-purple-500/20 via-violet-500/10 to-transparent',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    avatar: 'from-purple-600 to-violet-700',
    dot: 'bg-purple-400',
    ring: 'ring-purple-500/30',
  },
  'admin': {
    label: 'Admin',
    Icon: Shield,
    gradient: 'from-blue-500/20 via-sky-500/10 to-transparent',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.12)]',
    avatar: 'from-blue-600 to-sky-700',
    dot: 'bg-blue-400',
    ring: 'ring-blue-500/30',
  },
  'user': {
    label: 'User',
    Icon: User,
    gradient: 'from-emerald-500/20 via-green-500/10 to-transparent',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',
    avatar: 'from-emerald-600 to-green-700',
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-500/30',
  },
  'team_admin': {
    label: 'Team Admin',
    Icon: Users2,
    gradient: 'from-teal-500/20 via-cyan-500/10 to-transparent',
    border: 'border-teal-500/30',
    badge: 'bg-teal-500/15 text-teal-300 border border-teal-500/30',
    glow: 'shadow-[0_0_20px_rgba(20,184,166,0.12)]',
    avatar: 'from-teal-600 to-cyan-700',
    dot: 'bg-teal-400',
    ring: 'ring-teal-500/30',
  },
  'team_user': {
    label: 'Team Agent',
    Icon: Headset,
    gradient: 'from-indigo-500/20 via-blue-500/10 to-transparent',
    border: 'border-indigo-500/30',
    badge: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
    glow: 'shadow-[0_0_20px_rgba(99,102,241,0.12)]',
    avatar: 'from-indigo-600 to-blue-700',
    dot: 'bg-indigo-400',
    ring: 'ring-indigo-500/30',
  },
};

const getInitials = (name = 'U') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

// ── Stat Card ───────────────────────────────────────────────
const StatCard = ({ role, count, active, onClick }) => {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.Icon;
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden flex flex-col gap-1 p-4 rounded-2xl border transition-all duration-300 text-left cursor-pointer
        ${active
          ? `bg-gradient-to-br ${cfg.gradient} ${cfg.border} ${cfg.glow} ring-1 ${cfg.ring}`
          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
        }`}
    >
      <div className={`p-2.5 rounded-xl w-fit mb-1 ${active ? `bg-gradient-to-br ${cfg.gradient} ${cfg.border}` : 'bg-white/5'}`}>
        <Icon size={18} className={active ? cfg.badge.split(' ')[1] : 'text-white/40'} />
      </div>
      <div className="text-2xl font-black text-white">{count}</div>
      <div className="text-xs text-white/50 font-medium">{cfg.label}</div>
      {active && <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${cfg.gradient}`} />}
    </button>
  );
};

// ── User Card ───────────────────────────────────────────────
const UserCard = ({ user, isSelf, onRoleChange, isPending, isSaving }) => {
  const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG['user'];
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative group rounded-2xl border transition-all duration-300
      ${isPending
        ? `bg-gradient-to-br ${cfg.gradient} ${cfg.border} ${cfg.glow}`
        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/15'
      }`}
    >
      <div className="p-4 flex items-center gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {user.avatar ? (
            <img
              src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`}
              alt="avatar"
              className={`w-12 h-12 rounded-full object-cover ring-2 ${isPending ? cfg.ring : 'ring-white/10'}`}
            />
          ) : (
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${cfg.avatar} flex items-center justify-center ring-2 ${isPending ? cfg.ring : 'ring-white/10'} font-bold text-sm text-white`}>
              {getInitials(user.name)}
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0d0d0f] ${cfg.dot}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-white truncate">{user.name}</div>
          <div className="text-xs text-white/30 truncate mt-0.5">{user.email}</div>
          <div className="mt-1.5">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
              <cfg.Icon size={9} />
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Role Selector */}
        {!isSelf && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {isPending && (
              <>
                <button
                  onClick={() => onRoleChange(user._id, null)}
                  disabled={isSaving}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={14} />
                </button>
                <button
                  onClick={() => onRoleChange(user._id, isPending, true)}
                  disabled={isSaving}
                  className="p-2 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 transition-all"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
              </>
            )}

            <div className="relative">
              <button
                onClick={() => setIsOpen(v => !v)}
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-all duration-200
                  ${isPending
                    ? `bg-gradient-to-r ${cfg.gradient} ${cfg.border} text-white`
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/25'
                  }`}
              >
                <span>{isPending ? `→ ${ROLE_CONFIG[isPending]?.label || isPending}` : 'Change'}</span>
                <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="absolute right-0 top-full mt-2 z-30 w-44 bg-[#111318] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                  {ROLES_ORDERED.filter(r => r !== 'super-admin').map(r => {
                    const rc = ROLE_CONFIG[r];
                    const RIcon = rc.Icon;
                    return (
                      <button
                        key={r}
                        onClick={() => { onRoleChange(user._id, r === user.role ? null : r); setIsOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors
                          ${r === user.role ? 'bg-white/5 text-white/40 cursor-default' : 'text-white/80 hover:bg-white/5 cursor-pointer'}`}
                      >
                        <RIcon size={13} className={r === user.role ? 'opacity-40' : ''} />
                        {rc.label}
                        {r === user.role && <span className="ml-auto text-[9px] text-white/30">current</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {isSelf && (
          <div className="flex-shrink-0">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">YOU</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Confirmation Modal ──────────────────────────────────────
const ConfirmModal = ({ targetUser, newRole, onConfirm, onCancel }) => {
  const cfg = ROLE_CONFIG[newRole] || ROLE_CONFIG['user'];
  const Icon = cfg.Icon;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111318] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${cfg.gradient}`} />
        <div className="relative z-10">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br ${cfg.gradient} border ${cfg.border}`}>
            <AlertTriangle size={22} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Confirm Role Change</h3>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Changing <span className="text-white font-semibold">{targetUser.name}</span>'s role to{' '}
            <span className={`font-bold ${cfg.badge.split(' ')[1]}`}>{cfg.label}</span>.
            <br /><br />
            Their feature access will be automatically reset to <strong className="text-white/70">{cfg.label}</strong> defaults.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-br ${cfg.gradient} border ${cfg.border} text-white hover:opacity-90 transition-all ${cfg.glow}`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Feature Dropzone ────────────────────────────────────────
const FeatureCard = ({ feature, isAssigned, isLocked, onDragStart, roleCfg }) => {
  return (
    <div
      draggable={!isLocked}
      onDragStart={(e) => onDragStart(e, feature.id, isAssigned)}
      className={`p-3 rounded-2xl border transition-all duration-300 flex items-center gap-3
        ${isLocked 
          ? 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed' 
          : isAssigned
            ? `bg-gradient-to-r ${roleCfg.gradient} ${roleCfg.border} cursor-grab active:cursor-grabbing hover:scale-[1.02]`
            : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/20 cursor-grab active:cursor-grabbing hover:scale-[1.02]'
        }`}
    >
      <div className={`p-2 rounded-xl ${isAssigned ? 'bg-white/10' : 'bg-white/5'}`}>
        <ToggleLeft size={16} className={isAssigned ? 'text-white' : 'text-white/40'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate">{feature.label}</div>
        <div className="text-[10px] text-white/40 truncate mt-0.5">{feature.section} Module</div>
      </div>
      {isLocked && <ShieldAlert size={14} className="text-white/30 mr-1" />}
    </div>
  );
};


// ── Main Page ───────────────────────────────────────────────
export default function RoleManagement() {
  const { user: currentUser, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Tabs & Filter
  const [roleFilter, setRoleFilter] = useState('');
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'features'
  
  const [draftRoles, setDraftRoles] = useState({});
  const [isSaving, setIsSaving] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // Features State
  const [roleFeatures, setRoleFeatures] = useState({}); // { 'admin': ['dashboard', 'reports'] }
  const [isSavingFeatures, setIsSavingFeatures] = useState(false);
  const [draggedFeature, setDraggedFeature] = useState(null);
  const [isDraggingOverAssigned, setIsDraggingOverAssigned] = useState(false);
  const [isDraggingOverAvailable, setIsDraggingOverAvailable] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;

      const [resUsers, resCounts] = await Promise.all([
        axios.get(`${API_BASE}/api/super-admin/role-management`, { headers, params }),
        axios.get(`${API_BASE}/api/super-admin/role-management/counts`, { headers })
      ]);

      const sorted = [...resUsers.data.users].sort((a, b) => {
        return ROLES_ORDERED.indexOf(a.role) - ROLES_ORDERED.indexOf(b.role);
      });

      setUsers(sorted);
      setCounts(resCounts.data);
      setDraftRoles({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    }
    setLoading(false);
  }, [search, roleFilter, token]);

  const fetchFeaturesForRole = useCallback(async (role) => {
    try {
      // In the Tealvue system, there's no endpoint to get "defaults" for a role directly other than checking an actual user with that role, or maybe checking /api/super-admin/features and reducing.
      // But we can check via users list if we want, or fetch the global feature mapping.
      // Actually, updating role features might be updating a schema. Let's just fetch all users and their features and find the unique set for that role.
      const res = await axios.get(`${API_BASE}/api/super-admin/features`, { headers });
      
      const featureData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      
      // Compute features for the requested role (intersection of all users in that role)
      // or we can use the first user's features as representative of the role's default.
      const usersInRole = featureData.filter(u => u.role === role);
      if (usersInRole.length > 0) {
        setRoleFeatures(prev => ({ ...prev, [role]: usersInRole[0].features }));
      } else {
        // Fallback default
        setRoleFeatures(prev => ({ ...prev, [role]: ['dashboard'] }));
      }
    } catch (err) {
      toast.error('Failed to load role features');
    }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  useEffect(() => {
    if (roleFilter && activeTab === 'features') {
      fetchFeaturesForRole(roleFilter);
    }
  }, [roleFilter, activeTab, fetchFeaturesForRole]);


  const handleRoleChange = (userId, newRole, confirmed = false) => {
    if (newRole === null) {
      setDraftRoles(d => { const n = { ...d }; delete n[userId]; return n; });
      return;
    }
    const user = users.find(u => u._id === userId);
    if (confirmed) {
      setConfirmModal({ targetUser: user, newRole });
    } else {
      setDraftRoles(d => ({ ...d, [userId]: newRole }));
    }
  };

  const confirmRoleChange = async () => {
    const { targetUser, newRole } = confirmModal;
    setIsSaving(targetUser._id);
    setConfirmModal(null);
    try {
      const res = await axios.put(
        `${API_BASE}/api/super-admin/role-management/${targetUser._id}`,
        { newRole },
        { headers }
      );
      toast.success(res.data.message);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change role');
      setDraftRoles(d => { const n = { ...d }; delete n[targetUser._id]; return n; });
    }
    setIsSaving(null);
  };

  // ── Drag & Drop Handlers ──
  const handleDragStart = (e, featureId, isAssigned) => {
    setDraggedFeature({ featureId, isAssigned });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', featureId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, targetIsAssigned) => {
    e.preventDefault();
    if (targetIsAssigned) {
      setIsDraggingOverAssigned(true);
    } else {
      setIsDraggingOverAvailable(true);
    }
  };

  const handleDragLeave = (e, targetIsAssigned) => {
    e.preventDefault();
    if (targetIsAssigned) {
      setIsDraggingOverAssigned(false);
    } else {
      setIsDraggingOverAvailable(false);
    }
  };

  const handleDrop = async (e, dropZoneIsAssigned) => {
    e.preventDefault();
    setIsDraggingOverAssigned(false);
    setIsDraggingOverAvailable(false);
    if (!draggedFeature || !roleFilter) return;
    if (draggedFeature.isAssigned === dropZoneIsAssigned) return; // Dropped in same zone

    const featureId = draggedFeature.featureId;


    const currentFeatures = roleFeatures[roleFilter] || [];
    let newFeatures = [...currentFeatures];

    if (dropZoneIsAssigned) {
      // Add feature
      if (!newFeatures.includes(featureId)) newFeatures.push(featureId);
    } else {
      // Remove feature
      newFeatures = newFeatures.filter(f => f !== featureId);
    }

    // Optimistic update
    setRoleFeatures(prev => ({ ...prev, [roleFilter]: newFeatures }));
    
    // Save to server
    try {
        setIsSavingFeatures(true);
        await axios.put(`${API_BASE}/api/super-admin/features/role/${roleFilter}`, {
            features: newFeatures
        }, { headers });
        toast.success(`Updated ${roleFilter} features`);
        if (currentUser && currentUser.role === roleFilter) {
          setFeatures(newFeatures);
        }
    } catch (err) {
        toast.error("Failed to update features");
        fetchFeaturesForRole(roleFilter); // Revert
    } finally {
        setIsSavingFeatures(false);
    }
    setDraggedFeature(null);
  };

  const displayUsers = users.map(u => ({
    ...u,
    pendingRole: draftRoles[u._id] || null,
  }));

  const activeRoleConfig = roleFilter ? ROLE_CONFIG[roleFilter] : null;
  const currentRoleFeaturesList = roleFeatures[roleFilter] || [];

  return (
    <div className="p-6 max-w-7xl mx-auto text-white space-y-7 pb-20">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 rounded-3xl p-7">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-10 bg-teal-400 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-[80px] opacity-5 bg-cyan-400 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-teal-500/15 border border-teal-500/25">
              <UserCog size={32} className="text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Role Management</h1>
              <p className="text-sm text-white/40 mt-1">Assign and manage access levels for all platform users</p>
            </div>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2">
            <span className="text-xs text-white/30">{counts.total || 0} total users</span>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ROLES_ORDERED.map(r => (
          <StatCard
            key={r}
            role={r}
            count={counts[r] || 0}
            active={roleFilter === r}
            onClick={() => {
                setRoleFilter(roleFilter === r ? '' : r);
                if (roleFilter === r) setActiveTab('users'); // Reset to users if deselecting
            }}
          />
        ))}
      </div>

      {/* ── Tabs (Only if role is selected) ── */}
      {roleFilter && (
        <div className="flex items-center justify-center -mb-2">
            <div className="bg-white/[0.02] p-1.5 rounded-2xl border border-white/5 flex gap-2 w-full max-w-sm">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        activeTab === 'users' ? `bg-gradient-to-r ${activeRoleConfig.gradient} ${activeRoleConfig.border} text-white` : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Users size={16} />
                    Users
                </button>
                <button
                    onClick={() => setActiveTab('features')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        activeTab === 'features' ? `bg-gradient-to-r ${activeRoleConfig.gradient} ${activeRoleConfig.border} text-white` : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <LayoutGrid size={16} />
                    Features
                </button>
            </div>
        </div>
      )}

      {/* ── Tab Content ── */}
      {activeTab === 'users' || !roleFilter ? (
          <>
            {/* ── Search Bar ── */}
            <div className="relative">
                <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                <input
                type="text"
                placeholder="Search users by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder:text-white/25 focus:border-teal-500/50 focus:outline-none focus:bg-white/[0.06] transition-all duration-300"
                />
                {search && (
                <button
                    onClick={() => setSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                >
                    <X size={15} />
                </button>
                )}
            </div>

            {/* ── User Grid ── */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex gap-4 overflow-hidden">
                        <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 w-1/2 bg-white/5 animate-pulse rounded" />
                            <div className="h-3 w-3/4 bg-white/5 animate-pulse rounded" />
                        </div>
                    </div>
                ))}
                </div>
            ) : displayUsers.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-3 text-white/25">
                <Users size={48} className="opacity-30" />
                <p className="text-sm">No users found matching your criteria</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayUsers.map(u => (
                    <UserCard
                    key={u._id}
                    user={u}
                    isSelf={u._id === currentUser?._id}
                    isPending={u.pendingRole}
                    isSaving={isSaving === u._id}
                    onRoleChange={(userId, role, needsConfirm) => {
                        if (needsConfirm) {
                        const user = users.find(x => x._id === userId);
                        setConfirmModal({ targetUser: user, newRole: role });
                        } else {
                        handleRoleChange(userId, role);
                        }
                    }}
                    />
                ))}
                </div>
            )}
          </>
      ) : (
          /* ── Features Drag and Drop View ── */
          <div className="space-y-8">
              
              {/* Top Section: Assigned Features */}
              <div 
                className={`border rounded-3xl p-6 transition-all duration-300 relative overflow-hidden bg-gradient-to-b ${activeRoleConfig.gradient} 
                  ${isDraggingOverAssigned ? 'border-dashed border-teal-500 bg-teal-500/[0.03] scale-[1.005]' : 'border-white/10'}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, true)}
                onDragLeave={(e) => handleDragLeave(e, true)}
                onDrop={(e) => handleDrop(e, true)}
              >
                  {/* Subtle Role Icon Background */}
                  <activeRoleConfig.Icon size={180} className="absolute -bottom-16 -right-16 text-white/5 pointer-events-none -rotate-12" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
                      <div>
                          <h3 className="font-bold text-xl text-white flex items-center gap-2">
                            <activeRoleConfig.Icon className={activeRoleConfig.text} size={20} />
                            Assigned to {activeRoleConfig.label}
                          </h3>
                          <p className="text-xs text-white/40 mt-1">These features are currently active for this role. Drag them out to unassign them.</p>
                      </div>
                      <div className={`px-4 py-1.5 rounded-xl text-xs font-bold border w-fit ${activeRoleConfig.badge}`}>
                          {currentRoleFeaturesList.length} Active
                      </div>
                  </div>

                  <div className="relative z-10 min-h-[120px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                          {FEATURES.filter(f => currentRoleFeaturesList.includes(f.id)).map(feature => {
                              return (
                                  <FeatureCard 
                                    key={feature.id} 
                                    feature={feature} 
                                    isAssigned={true} 
                                    isLocked={false}
                                    onDragStart={handleDragStart} 
                                    roleCfg={activeRoleConfig} 
                                  />
                              );
                          })}
                      </div>
                      {currentRoleFeaturesList.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center border border-dashed border-white/5 rounded-2xl py-12 text-center text-white/30 text-sm italic">
                              Drag and drop features here to assign them to {activeRoleConfig.label}
                          </div>
                      )}
                  </div>
                  
                  {/* Loading Overlay */}
                  {isSavingFeatures && (
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm z-25 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-3">
                              <RefreshCw size={28} className="text-teal-400 animate-spin" />
                              <span className="text-xs text-white/60 font-semibold">Saving changes...</span>
                          </div>
                      </div>
                  )}
              </div>

              {/* Bottom Section: Available Features */}
              <div 
                className={`bg-white/[0.01] border rounded-3xl p-6 transition-all duration-300 flex flex-col min-h-[200px]
                  ${isDraggingOverAvailable ? 'border-dashed border-white/30 bg-white/[0.03] scale-[1.005]' : 'border-white/5'}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, false)}
                onDragLeave={(e) => handleDragLeave(e, false)}
                onDrop={(e) => handleDrop(e, false)}
              >
                  <div className="flex items-center justify-between mb-6">
                      <div>
                          <h3 className="font-bold text-xl text-white">Available Features</h3>
                          <p className="text-xs text-white/40 mt-1">Drag features from here to the area above to assign them.</p>
                      </div>
                      <div className="px-4 py-1.5 bg-white/5 rounded-xl text-xs font-semibold text-white/50 border border-white/10">
                          {FEATURES.filter(f => !currentRoleFeaturesList.includes(f.id)).length} Available
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {FEATURES.filter(f => !currentRoleFeaturesList.includes(f.id)).map(feature => (
                          <FeatureCard 
                            key={feature.id} 
                            feature={feature} 
                            isAssigned={false} 
                            isLocked={false}
                            onDragStart={handleDragStart} 
                            roleCfg={activeRoleConfig} 
                          />
                      ))}
                  </div>
                  {FEATURES.filter(f => !currentRoleFeaturesList.includes(f.id)).length === 0 && (
                      <div className="py-12 text-center text-white/30 text-sm italic">
                          All features have been assigned to this role!
                      </div>
                  )}
              </div>

          </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal && (
        <ConfirmModal
          targetUser={confirmModal.targetUser}
          newRole={confirmModal.newRole}
          onConfirm={confirmRoleChange}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
