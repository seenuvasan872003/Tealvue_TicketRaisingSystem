// ============================================================
//  client/src/pages/UserManagement.jsx  —  Admin User List
// ============================================================
//  Accessible by: Admin, Super Admin
//  Super Admin can see and edit Admin/User accounts.
//  Admin can see and edit User accounts only.
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, updateUserStatus, getUserStats } from '../services/userApi';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, UserPlus, Search, RefreshCw, XCircle, CheckCircle, Crown, Eye, Users, ShieldAlert, Check, Unlock, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import logger from '../utils/logger';
import ExportButton from '../components/ExportButton';
import { useConfirm } from '../context/ConfirmContext';

import { getCache, setCache, invalidateCache } from '../utils/cache';
import CreateUserModal from '../components/modals/CreateUserModal';

const UserManagement = () => {
  const confirm = useConfirm();
  const { user: currentUser, isSuperAdmin } = useAuth();
  const rolePrefix = currentUser?.role === 'super-admin' ? 'super-admin' : 'admin';
  const [users, setUsers]       = useState(() => {
    const cached = getCache('all_users');
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading]   = useState(() => {
    const cached = getCache('all_users');
    return !Array.isArray(cached);
  });
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all'); // all, admin, user, teams, pending, suspended
  const [statusModal, setStatusModal] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // User Creation Modal State
  const [modalType, setModalType]   = useState(null);
  const [modalOpen, setModalOpen]   = useState(false);

  const openModal  = (type) => { setModalType(type); setModalOpen(true); };
  const closeModal = ()     => { setModalType(null); setModalOpen(false); };

  const handleCreateSuccess = () => {
    closeModal();
    invalidateCache('all_users');
    loadUsers();
    loadStats();
    toast.success(modalType === 'admin' ? 'Admin created successfully' : 'User created successfully');
  };

  // Server-side Pagination & Stats State
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [total, setTotal]       = useState(() => (getCache('all_users') ? getCache('all_users').length : 0));
  const [stats, setStats]       = useState(() => getCache('user_stats') || { totalUsers: 0, activeUsers: 0, suspendedUsers: 0, pendingApprovals: 0 });

  const loadStats = async () => {
    logger.info('UserManagement', 'loadStats', 'Loading user statistics', { api: '/api/users/stats', method: 'GET', action: 'User Stats Load Start' });
    try {
      const { data } = await getUserStats();
      if (data) {
        setStats(data);
        setCache('user_stats', data, 10);
        logger.info('UserManagement', 'loadStats', `User stats loaded — total: ${data.totalUsers}`, { api: '/api/users/stats', method: 'GET', status: 200, action: 'User Stats Load Success' });
      }
    } catch (e) {
      logger.error('UserManagement', 'loadStats', 'Failed to load user stats', e, { api: '/api/users/stats', method: 'GET', action: 'User Stats Load Failure' });
      console.error('[UserManagement] load stats error:', e);
    }
  };

  const loadUsers = async () => {
    logger.info('UserManagement', 'loadUsers', `Loading users — filter: ${filter} | page: ${page}`, { api: '/api/users', method: 'GET', action: 'Users Load Start' });
    try {
      if (page !== 1 || filter !== 'all' || search.trim()) {
        setLoading(true);
      }
      const params = {
        page,
        limit: 15,
        search: search.trim()
      };

      // Map filter to backend API query params
      if (filter === 'admin') params.role = 'admin';
      else if (filter === 'user') params.role = 'user';
      else if (filter === 'teams') params.role = 'team_admin';
      else if (filter === 'team_user') params.role = 'team_user';
      else if (filter === 'pending') params.status = 'pending';
      else if (filter === 'suspended') params.status = 'suspended';

      const { data } = await getAllUsers(params);
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setSelectedUserIds([]);

      // Cache page 1 all users
      if (page === 1 && filter === 'all' && !search.trim()) {
        setCache('all_users', data.users || [], 10);
      }

      logger.info('UserManagement', 'loadUsers', `Users loaded — ${(data.users || []).length} of ${data.total || 0} total`, { api: '/api/users', method: 'GET', status: 200, action: 'Users Load Success' });
    } catch (e) {
      logger.error('UserManagement', 'loadUsers', 'Failed to load users', e, { api: '/api/users', method: 'GET', action: 'Users Load Failure' });
      console.error(e);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users reactive to filter, page, and search changes
  useEffect(() => {
    loadUsers();
  }, [page, filter, search]);

  // Load stats and users on mount
  useEffect(() => {
    loadStats();
  }, []);

  // Reset page to 1 on filter or search changes
  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  // ── Toggle Status ────────────────────────────────────────
  const handleToggleStatus = async (targetUser, updatesOrField, value) => {
    if (!isSuperAdmin && targetUser.role !== 'user') {
      toast.error('You do not have permission to modify this account');
      return;
    }
    try {
      const updates = typeof updatesOrField === 'string'
        ? { [updatesOrField]: value }
        : updatesOrField;

      await updateUserStatus(targetUser._id, updates);
      
      // Invalidate cache
      invalidateCache('all_users');
      
      setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, ...updates } : u));
      toast.success(`${targetUser.name} updated successfully`);
      loadStats(); // Reload stats counts
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    }
  };

  // ── UI Helpers ───────────────────────────────────────────
  const getRoleBadge = (role) => {
    if (role === 'super-admin') return <span className="badge role-badge-superadmin inline-flex items-center gap-1"><Crown size={11} /> Super Admin</span>;
    if (role === 'admin')       return <span className="badge role-badge-admin inline-flex items-center gap-1"><ShieldCheck size={11} /> Admin</span>;
    if (role === 'team_admin')  return <span className="badge role-badge-admin inline-flex items-center gap-1 bg-[rgba(20,160,125,0.1)] text-[var(--color-teal)] border border-[rgba(20,160,125,0.2)]"><ShieldCheck size={11} /> Team Admin</span>;
    if (role === 'team_user')   return <span className="badge role-badge-user inline-flex items-center gap-1 bg-[rgba(59,130,246,0.1)] text-[#3b82f6] border border-[rgba(59,130,246,0.2)]"><User size={11} /> Team User</span>;
    return <span className="badge role-badge-user inline-flex items-center gap-1"><User size={11} /> User</span>;
  };

  return (
    <div className="page-body fade-in">
      {/* Header */}
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage accounts, roles, and access controls</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* User Creation Buttons */}
          {isSuperAdmin && (
            <button 
              onClick={() => openModal('admin')}
              className="bg-gradient-to-r from-[#14a07d] to-[#0f766e] hover:from-[#0f766e] hover:to-[#14a07d] text-white font-semibold px-[18px] py-2 rounded-lg flex items-center gap-1.5 transition-all duration-300 text-xs cursor-pointer shadow-md"
            >
              <ShieldCheck size={14} />
              Create Admin
            </button>
          )}
          <button 
            onClick={() => openModal('user')}
            className="bg-gradient-to-r from-[#14a07d] to-[#0f766e] hover:from-[#0f766e] hover:to-[#14a07d] text-white font-semibold px-[18px] py-2 rounded-lg flex items-center gap-1.5 transition-all duration-300 text-xs cursor-pointer shadow-md"
          >
            <UserPlus size={14} />
            Create User
          </button>

          <ExportButton
            endpoint={`/api/${rolePrefix}/export/users`}
            filename="users"
            filters={{ role: filter !== 'all' ? filter : undefined }}
          />
          <button 
            className="btn btn-secondary flex items-center gap-1.5 cursor-pointer" 
            onClick={() => { 
              invalidateCache('all_users'); 
              invalidateCache('user_stats');
              setLoading(true);
              loadUsers(); 
              loadStats(); 
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mb-6">
        <div className="stat-card bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-[18px] flex items-center gap-4">
          <div className="bg-[rgba(255,255,255,0.04)] p-2.5 rounded-[10px] flex items-center justify-center">
            <Users size={24} className="text-[var(--color-teal)]" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-[0.05em] mb-0.5">Total Accounts</div>
            <div className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-[18px] flex items-center gap-4">
          <div className="bg-[rgba(134,239,172,0.06)] p-2.5 rounded-[10px] flex items-center justify-center">
            <CheckCircle size={24} className="text-[#86efac]" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-[0.05em] mb-0.5">Active Users</div>
            <div className="text-2xl font-bold text-[#86efac]">{stats.activeUsers.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-[18px] flex items-center gap-4">
          <div className="bg-[rgba(239,68,68,0.06)] p-2.5 rounded-[10px] flex items-center justify-center">
            <XCircle size={24} className="text-[#f87171]" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-[0.05em] mb-0.5">Suspended</div>
            <div className="text-2xl font-bold text-[#f87171]">{stats.suspendedUsers.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-[18px] flex items-center gap-4">
          <div className="bg-[rgba(251,146,60,0.06)] p-2.5 rounded-[10px] flex items-center justify-center">
            <ShieldAlert size={24} className="text-[#fb923c]" />
          </div>
          <div>
            <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-[0.05em] mb-0.5">Pending Approval</div>
            <div className="text-2xl font-bold text-[#fb923c]">{stats.pendingApprovals.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card px-5 py-4 mb-5 flex gap-4 items-center flex-wrap bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl">
        <div className="search-box flex-1 min-w-[240px] relative">
          <input
            className="form-input pl-3.5 pr-[38px] bg-[var(--color-surface)] border border-[var(--color-border)] text-white rounded-lg h-[38px] w-full outline-none"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={16} className="absolute right-3 top-2.5 text-[var(--color-text-muted)] pointer-events-none" />
        </div>
        <div className="flex gap-2 items-center bg-[var(--color-surface)] border border-[var(--color-border)] px-3 rounded-lg h-[38px] text-[13px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#888] whitespace-nowrap">Filter By:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent border-none text-white outline-none font-semibold text-xs cursor-pointer h-full pr-2"
          >
            <option value="all" className="bg-[#111] text-white">All Accounts</option>
            <option value="admin" className="bg-[#111] text-white">Admins</option>
            <option value="user" className="bg-[#111] text-white">Users</option>
            <option value="teams" className="bg-[#111] text-white">Team Admins</option>
            <option value="team_user" className="bg-[#111] text-white">Team Users</option>
            <option value="pending" className="bg-[#111] text-white">Pending Approval</option>
            <option value="suspended" className="bg-[#111] text-white">Suspended</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Controls */}
      {selectedUserIds.length > 0 && (
        <div className="flex items-center justify-between bg-[rgba(20,20,20,0.8)] border border-[var(--color-border)] px-4 py-3 rounded-lg mb-4 animate-[fadeIn_0.2s]">
          <span className="text-[13px] text-[var(--color-teal)] font-semibold">
            {selectedUserIds.length} users selected for bulk actions
          </span>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const ok = window.confirm(`Are you sure you want to suspend these ${selectedUserIds.length} selected users?`);
                if (ok) {
                  try {
                    const { toggleUserStatus } = await import('../services/userApi');
                    await Promise.all(selectedUserIds.map(id => toggleUserStatus(id, { isActive: false })));
                    toast.success('Selected users suspended successfully');
                    setSelectedUserIds([]);
                    loadUsers();
                  } catch (err) {
                    toast.error('Failed to suspend some selected users');
                  }
                }
              }}
              className="px-3 py-1.5 bg-[#fb923c] text-black border-none rounded cursor-pointer text-xs font-semibold hover:opacity-90 transition-all"
            >
              Bulk Suspend
            </button>
            <button
              onClick={async () => {
                const ok = window.confirm(`Are you sure you want to permanently delete these ${selectedUserIds.length} selected users?`);
                if (ok) {
                  try {
                    const { deleteUser } = await import('../services/userApi');
                    await Promise.all(selectedUserIds.map(id => deleteUser(id)));
                    toast.success('Selected users deleted successfully');
                    setSelectedUserIds([]);
                    loadUsers();
                    loadStats();
                  } catch (err) {
                    toast.error('Failed to delete some selected users');
                  }
                }
              }}
              className="px-3 py-1.5 bg-[#ef4444] text-white border-none rounded cursor-pointer text-xs font-semibold hover:opacity-90 transition-all"
            >
              Bulk Delete
            </button>
          </div>
        </div>
      )}

      {/* User Table */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-[60px] text-center"><div className="spinner w-7 h-7 mx-auto" /></div>
        ) : users.length === 0 ? (
          <div className="p-[60px] text-center text-[var(--color-text-muted)]">No users found matching filters.</div>
        ) : (
          <div className="table-wrap">
            <table className="w-full min-w-[800px] border-collapse text-[13px] table-fixed">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[rgba(255,255,255,0.03)]">
                  <th className="w-[46px] px-3 py-3.5 font-semibold text-[#acacac] text-[11px] uppercase tracking-[0.05em] text-center">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedUserIds.length === users.length}
                      onChange={() => {
                        if (selectedUserIds.length === users.length) {
                          setSelectedUserIds([]);
                        } else {
                          setSelectedUserIds(users.map(u => u._id));
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="w-[25%] px-5 py-3.5 font-semibold text-[#acacac] text-[11px] uppercase tracking-[0.05em] text-left">User</th>
                  <th className="w-[25%] px-5 py-3.5 font-semibold text-[#acacac] text-[11px] uppercase tracking-[0.05em] text-left">Role</th>
                  <th className="w-[25%] px-5 py-3.5 font-semibold text-[#acacac] text-[11px] uppercase tracking-[0.05em] text-left">Status</th>
                  <th className="w-[25%] px-5 py-3.5 font-semibold text-[#acacac] text-[11px] uppercase tracking-[0.05em] text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const canEdit = isSuperAdmin || (currentUser.role === 'admin' && u.role === 'user');
                  const isSelf  = u._id === currentUser._id;

                  return (
                    <tr key={u._id} className="border-b border-[var(--color-border-soft)] transition-colors duration-200 table-row-hover">
                      <td className="px-3 py-3.5 text-center w-[46px]">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u._id)}
                          onChange={() => {
                            if (selectedUserIds.includes(u._id)) {
                              setSelectedUserIds(prev => prev.filter(id => id !== u._id));
                            } else {
                              setSelectedUserIds(prev => [...prev, u._id]);
                            }
                          }}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-3.5 text-left overflow-hidden text-ellipsis whitespace-nowrap">
                        <div className="font-semibold text-[#e4e4e4] overflow-hidden text-ellipsis">{u.name}</div>
                        <div className="text-xs text-[#888] overflow-hidden text-ellipsis">{u.email}</div>
                      </td>
                      <td className="px-5 py-3.5 text-left">{getRoleBadge(u.role)}</td>
                      <td className="px-5 py-3.5 text-left">
                        <div className="flex justify-start items-center gap-1.5 whitespace-nowrap">
                          {u.securityFlags >= 5 || (u.securityBlockUntil && new Date(u.securityBlockUntil) > new Date()) ? (
                            <span className="status-blocked inline-flex items-center gap-1 bg-[rgba(239,68,68,0.1)] text-[#ef4444] py-1 px-2 rounded-md text-[11px] border border-[rgba(239,68,68,0.2)]">
                              <ShieldAlert size={11} /> Blocked
                            </span>
                          ) : !u.isApproved ? (
                            <span className="status-pending inline-flex items-center gap-1 bg-[rgba(251,146,60,0.1)] text-[#fb923c] py-1 px-2 rounded-md text-[11px] border border-[rgba(251,146,60,0.2)]">
                              <RefreshCw size={11} className="spin" /> Pending
                            </span>
                          ) : !u.isActive ? (
                            <span className="status-suspended inline-flex items-center gap-1 bg-[rgba(239,68,68,0.1)] text-[#f87171] py-1 px-2 rounded-md text-[11px] border border-[rgba(239,68,68,0.2)]">
                              <XCircle size={11} /> Suspended
                            </span>
                          ) : (
                            <span className="status-active inline-flex items-center gap-1 bg-[rgba(16,185,129,0.1)] text-[#10b981] py-1 px-2 rounded-md text-[11px] border border-[rgba(16,185,129,0.2)]">
                              <CheckCircle size={11} /> Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-left">
                        <div className="flex gap-2 justify-start items-center">
                           {canEdit && !isSelf && (
                            <>
                              {!u.isApproved ? (
                                <div className="inline-flex gap-1.5">
                                  <button className="p-1.5 h-7 w-7 rounded-md inline-flex items-center justify-center bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 cursor-pointer transition-all" title="Approve Account" onClick={() => handleToggleStatus(u, 'isApproved', true)}>
                                    <Check size={14} />
                                  </button>
                                  <button className="p-1.5 h-7 w-7 rounded-md inline-flex items-center justify-center bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 cursor-pointer transition-all" title="Suspend Account" onClick={() => handleToggleStatus(u, { isApproved: true, isActive: false })}>
                                    <XCircle size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className={`p-1.5 h-7 w-7 rounded-md inline-flex items-center justify-center border cursor-pointer transition-all ${u.isActive ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'}`}
                                  title={u.isActive ? 'Suspend Account' : 'Unsuspend Account'}
                                  onClick={() => {
                                    if (u.isActive) {
                                      setStatusModal({ user: u });
                                    } else {
                                      handleToggleStatus(u, { isActive: true, isApproved: true });
                                    }
                                  }}
                                >
                                  {u.isActive ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                </button>
                              )}
                              
                              {/* Super Admin Actions */}
                              {isSuperAdmin && (
                                <>
                                  {(u.securityFlags >= 5 || (u.securityBlockUntil && new Date(u.securityBlockUntil) > new Date())) && (
                                    <button
                                      className="p-1.5 h-7 w-7 rounded-md inline-flex items-center justify-center bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 cursor-pointer transition-all"
                                      title="Unblock User"
                                      onClick={async () => {
                                        const ok = await confirm(`Are you sure you want to unblock user "${u.name}"?`, 'Unblock User');
                                        if (ok) {
                                          try {
                                            const { unblockUser } = await import('../services/userApi');
                                            await unblockUser(u._id);
                                            toast.success('User unblocked successfully');
                                            loadUsers();
                                          } catch (err) {
                                            toast.error(err.response?.data?.message || 'Failed to unblock user');
                                          }
                                        }
                                      }}
                                    >
                                      <Unlock size={14} />
                                    </button>
                                  )}
                                  <button
                                    className="p-1.5 h-7 w-7 rounded-md inline-flex items-center justify-center bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 cursor-pointer transition-all"
                                    title="Delete User"
                                    onClick={async () => {
                                      const ok = await confirm(`Are you sure you want to permanently delete user "${u.name}"?`, 'Delete User');
                                      if (ok) {
                                        try {
                                          const { deleteUser } = await import('../services/userApi');
                                          await deleteUser(u._id);
                                          toast.success('User deleted successfully');
                                          loadUsers();
                                          loadStats();
                                        } catch (err) {
                                          toast.error(err.response?.data?.message || 'Failed to delete user');
                                        }
                                      }
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {isSelf && <span className="text-[11px] text-[var(--color-text-muted)] italic">It's you</span>}
                          {!canEdit && !isSelf && <span className="text-[11px] text-[var(--color-text-muted)]">No access</span>}
                          <Link 
                            to={isSuperAdmin ? `/super-admin/users/${u._id}/activity` : `/admin/users/${u._id}/activity`} 
                            className="p-1.5 h-7 w-7 rounded-md inline-flex items-center justify-center bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 cursor-pointer transition-all"
                            title="View Activity Logs"
                          >
                            <Eye size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
      {/* Pagination Footer */}
        {users.length > 0 && (
          <div className="flex justify-between items-center px-5 py-3.5 border-t border-[var(--color-border)] bg-[rgba(255,255,255,0.01)]">
            <span className="text-xs text-[var(--color-text-muted)]">
              Showing <strong>{total === 0 ? 0 : ((page - 1) * 15) + 1}</strong> to <strong>{Math.min(page * 15, total)}</strong> of <strong>{total}</strong> users
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={`btn btn-ghost btn-sm px-3 py-1.5 flex items-center gap-1 ${page === 1 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-sm px-3 py-1.5 flex items-center gap-1 ${(page === pages || pages === 0) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                disabled={page === pages || pages === 0}
                onClick={() => setPage(prev => Math.min(prev + 1, pages))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Choose Action Modal for Suspension */}
      {statusModal && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.85)] flex items-center justify-center z-[1000] backdrop-blur-[4px]">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-7 w-full max-w-[480px]">
            <h3 className="m-0 mb-4 text-base text-[#fb923c] font-semibold">Choose Action for {statusModal.user.name}</h3>
            <p className="text-[var(--color-text-muted)] text-sm mb-6 leading-relaxed">
              Select whether you want to completely suspend this user or move their account status back to pending approval.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                type="button" 
                className="btn btn-danger flex justify-center bg-[#d32f2f] text-white border-none py-2.5 rounded-md cursor-pointer font-semibold text-[13px]"
                onClick={() => {
                  handleToggleStatus(statusModal.user, { isActive: false });
                  setStatusModal(null);
                }}
              >
                Suspend Account
              </button>
              <button 
                type="button" 
                className="btn flex justify-center bg-[#fb923c] text-black border-none py-2.5 rounded-md cursor-pointer font-semibold text-[13px]"
                onClick={() => {
                  handleToggleStatus(statusModal.user, { isApproved: false });
                  setStatusModal(null);
                }}
              >
                Move to Pending Approval
              </button>
              <button 
                type="button" 
                className="btn btn-ghost flex justify-center border border-[var(--color-border)] py-2.5 rounded-md cursor-pointer font-semibold text-white text-[13px]"
                onClick={() => setStatusModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User/Admin Creation Modal */}
      <CreateUserModal
        isOpen={modalOpen}
        type={modalType}
        onClose={closeModal}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default UserManagement;
