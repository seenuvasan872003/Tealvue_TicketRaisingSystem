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
import { ShieldCheck, User, Search, RefreshCw, XCircle, CheckCircle, Crown, Eye, Users, ShieldAlert, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import logger from '../utils/logger';

const UserManagement = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all'); // all, admin, user, teams, pending, suspended
  const [statusModal, setStatusModal] = useState(null);

  // Server-side Pagination & Stats State
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [total, setTotal]       = useState(0);
  const [stats, setStats]       = useState({ totalUsers: 0, activeUsers: 0, suspendedUsers: 0, pendingApprovals: 0 });

  const loadStats = async () => {
    logger.info('UserManagement', 'loadStats', 'Loading user statistics', { api: '/api/users/stats', method: 'GET', action: 'User Stats Load Start' });
    try {
      const { data } = await getUserStats();
      if (data) {
        setStats(data);
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
      setLoading(true);
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
      setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, ...updates } : u));
      toast.success(`${targetUser.name} updated successfully`);
      loadStats(); // Reload stats counts
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    }
  };

  // ── UI Helpers ───────────────────────────────────────────
  const getRoleBadge = (role) => {
    if (role === 'super-admin') return <span className="badge role-badge-superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Crown size={11} /> Super Admin</span>;
    if (role === 'admin')       return <span className="badge role-badge-admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={11} /> Admin</span>;
    if (role === 'team_admin')  return <span className="badge role-badge-admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(20,160,125,0.1)', color: 'var(--color-teal)', border: '1px solid rgba(20,160,125,0.2)' }}><ShieldCheck size={11} /> Team Admin</span>;
    if (role === 'team_user')   return <span className="badge role-badge-user" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}><User size={11} /> Team User</span>;
    return <span className="badge role-badge-user" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={11} /> User</span>;
  };

  return (
    <div className="page-body fade-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage accounts, roles, and access controls</p>
        </div>
        <button className="btn btn-secondary" onClick={() => { loadUsers(); loadStats(); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} style={{ color: 'var(--color-teal)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Total Accounts</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{stats.totalUsers.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(134,239,172,0.06)', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} style={{ color: '#86efac' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Active Users</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#86efac' }}>{stats.activeUsers.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.06)', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={24} style={{ color: '#f87171' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Suspended</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f87171' }}>{stats.suspendedUsers.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(251, 146, 60, 0.06)', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={24} style={{ color: '#fb923c' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Pending Approval</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fb923c' }}>{stats.pendingApprovals.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <div className="search-box" style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--color-text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 38, background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: '#fff', borderRadius: 8, height: 38, width: '100%', outline: 'none' }}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs" style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.02)', padding: 4, borderRadius: 8, border: '1px solid var(--color-border)' }}>
          {['all', 'admin', 'user', 'teams', 'team_user', 'pending', 'suspended'].map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                background: filter === f ? 'var(--color-teal)' : 'transparent',
                border: 'none',
                borderRadius: 6,
                color: filter === f ? '#000' : '#acacac',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {f === 'team_user' ? 'Team Users' : f === 'teams' ? 'Team Admins' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* User Table */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
        ) : users.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>No users found matching filters.</div>
        ) : (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: '#acacac', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: '#acacac', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: '#acacac', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: '#acacac', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const canEdit = isSuperAdmin || (currentUser.role === 'admin' && u.role === 'user');
                  const isSelf  = u._id === currentUser._id;

                  return (
                    <tr key={u._id} style={{ borderBottom: '1px solid var(--color-border-soft)', transition: 'background 0.2s' }} className="table-row-hover">
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#e4e4e4' }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>{getRoleBadge(u.role)}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                          {!u.isApproved ? (
                            <span className="status-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(251,146,60,0.1)', color: '#fb923c', padding: '4px 8px', borderRadius: 6, fontSize: 11, border: '1px solid rgba(251,146,60,0.2)' }}>
                              <RefreshCw size={11} className="spin" /> Pending Approval
                            </span>
                          ) : !u.isActive ? (
                            <span className="status-suspended" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: '4px 8px', borderRadius: 6, fontSize: 11, border: '1px solid rgba(239,68,68,0.2)' }}>
                              <XCircle size={11} /> Suspended
                            </span>
                          ) : (
                            <span className="status-active" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 8px', borderRadius: 6, fontSize: 11, border: '1px solid rgba(16,185,129,0.2)' }}>
                              <CheckCircle size={11} /> Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                           {canEdit && !isSelf && (
                            <>
                              {!u.isApproved ? (
                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                  <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 11, height: 28, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => handleToggleStatus(u, 'isApproved', true)}>
                                    <Check size={11} /> Approve
                                  </button>
                                  <button className="btn btn-danger" style={{ padding: '4px 12px', fontSize: 11, height: 28, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e53e3e', border: 'none' }} onClick={() => handleToggleStatus(u, { isApproved: true, isActive: false })}>
                                    <XCircle size={11} /> Suspend
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className={`btn ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                                  style={{ padding: '4px 12px', fontSize: 11, height: 28, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onClick={() => {
                                    if (u.isActive) {
                                      setStatusModal({ user: u });
                                    } else {
                                      handleToggleStatus(u, { isActive: true, isApproved: true });
                                    }
                                  }}
                                >
                                  {u.isActive ? <XCircle size={11} /> : <CheckCircle size={11} />}
                                  {u.isActive ? 'Suspend' : 'Unsuspend'}
                                </button>
                              )}
                              
                              {/* Super Admin Delete Option */}
                              {isSuperAdmin && (
                                <button
                                  className="btn btn-danger "
                                  style={{ padding: '4px 12px', fontSize: 11, height: 28, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ef4444', color: 'white', border: 'none' }}
                                  onClick={async () => {
                                    if (window.confirm(`Are you sure you want to permanently delete user "${u.name}"?`)) {
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
                                  Delete
                                </button>
                              )}
                            </>
                          )}
                          {isSelf && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>It's you</span>}
                          {!canEdit && !isSelf && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>No access</span>}
                          <Link 
                            to={`/admin/users/${u._id}/activity`} 
                            className="btn btn-secondary flex items-center gap-1" 
                            style={{ padding: '4px 12px', fontSize: 11, height: 28, background: 'rgba(20,160,125,0.1)', color: 'var(--color-teal)', border: '1px solid rgba(20,160,125,0.25)' }}
                          >
                            <Eye size={12} /> Activity
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.01)' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Showing <strong>{total === 0 ? 0 : ((page - 1) * 15) + 1}</strong> to <strong>{Math.min(page * 15, total)}</strong> of <strong>{total}</strong> users
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page === pages || pages === 0}
                onClick={() => setPage(prev => Math.min(prev + 1, pages))}
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, cursor: (page === pages || pages === 0) ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Choose Action Modal for Suspension */}
      {statusModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#fb923c', fontWeight: 600 }}>Choose Action for {statusModal.user.name}</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              Select whether you want to completely suspend this user or move their account status back to pending approval.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button 
                type="button" 
                className="btn btn-danger" 
                style={{ display: 'flex', justifyContent: 'center', background: '#d32f2f', color: '#fff', border: 'none', padding: '10px 0', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                onClick={() => {
                  handleToggleStatus(statusModal.user, { isActive: false });
                  setStatusModal(null);
                }}
              >
                Suspend Account
              </button>
              <button 
                type="button" 
                className="btn" 
                style={{ display: 'flex', justifyContent: 'center', background: '#fb923c', color: '#000', border: 'none', padding: '10px 0', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                onClick={() => {
                  handleToggleStatus(statusModal.user, { isApproved: false });
                  setStatusModal(null);
                }}
              >
                Move to Pending Approval
              </button>
              <button 
                type="button" 
                className="btn btn-ghost" 
                style={{ display: 'flex', justifyContent: 'center', border: '1px solid var(--color-border)', padding: '10px 0', borderRadius: 6, cursor: 'pointer', fontWeight: 600, color: '#fff', fontSize: 13 }}
                onClick={() => setStatusModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
