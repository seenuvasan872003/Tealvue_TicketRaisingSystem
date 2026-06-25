// ============================================================
//  client/src/pages/UserManagement.jsx  —  Admin User List
// ============================================================
//  Accessible by: Admin, Super Admin
//  Super Admin can see and edit Admin/User accounts.
//  Admin can see and edit User accounts only.
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, updateUserStatus } from '../services/userApi';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Search, RefreshCw, XCircle, CheckCircle, Crown, Eye } from 'lucide-react';
import { toast } from 'react-toastify';

const UserManagement = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all'); // all, admin, user, teams, pending, suspended

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data } = await getAllUsers();
      // API returns { users: [], total, page, pages } — extract the array
      setUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // ── Toggle Status ────────────────────────────────────────
  const handleToggleStatus = async (targetUser, field, value) => {
    if (!isSuperAdmin && targetUser.role !== 'user') {
      toast.error('You do not have permission to modify this account');
      return;
    }
    try {
      await updateUserStatus(targetUser._id, { [field]: value });
      setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, [field]: value } : u));
      toast.success(`${targetUser.name} updated successfully`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    }
  };

  // ── Filters ──────────────────────────────────────────────
  let filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
  if (filter === 'admin')    filtered = filtered.filter(u => u.role === 'admin' || u.role === 'super-admin');
  if (filter === 'user')     filtered = filtered.filter(u => u.role === 'user');
  if (filter === 'teams')    filtered = filtered.filter(u => u.role === 'team_admin' || u.role === 'team_user');
  if (filter === 'pending')  filtered = filtered.filter(u => !u.isApproved);
  if (filter === 'suspended')filtered = filtered.filter(u => !u.isActive);

  // ── UI Helpers ───────────────────────────────────────────
  const getRoleBadge = (role) => {
    if (role === 'super-admin') return <span className="badge role-badge-superadmin"><Crown size={11} /> Super Admin</span>;
    if (role === 'admin')       return <span className="badge role-badge-admin"><ShieldCheck size={11} /> Admin</span>;
    if (role === 'team_admin')  return <span className="badge role-badge-admin" style={{ background: 'rgba(20,160,125,0.1)', color: 'var(--color-teal)' }}><ShieldCheck size={11} /> Team Admin</span>;
    if (role === 'team_user')   return <span className="badge role-badge-user" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}><User size={11} /> Team User</span>;
    return <span className="badge role-badge-user"><User size={11} /> User</span>;
  };

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage accounts, roles, and access</p>
        </div>
        <button className="btn btn-secondary" onClick={loadUsers}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Filters & Search ────────────────────────────── */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--color-text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {['all', 'admin', 'user', 'teams', 'pending', 'suspended'].map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── User Table ───────────────────────────────────── */}
      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>No users found matching filters.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)' }}>User</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Role</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--color-text-muted)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const canEdit = isSuperAdmin || (currentUser.role === 'admin' && u.role === 'user');
                const isSelf  = u._id === currentUser._id;

                return (
                  <tr key={u._id} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>{getRoleBadge(u.role)}</td>
                    <td style={{ padding: '14px 20px' }}>
                      {!u.isApproved ? (
                        <span className="status-pending"><RefreshCw size={12} style={{marginRight:4, verticalAlign:'middle'}}/>Pending Approval</span>
                      ) : !u.isActive ? (
                        <span className="status-suspended"><XCircle size={12} style={{marginRight:4, verticalAlign:'middle'}}/>Suspended</span>
                      ) : (
                        <span className="status-active"><CheckCircle size={12} style={{marginRight:4, verticalAlign:'middle'}}/>Active</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {canEdit && !isSelf && (
                          <>
                            {!u.isApproved ? (
                              <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handleToggleStatus(u, 'isApproved', true)}>
                                Approve
                              </button>
                            ) : (
                              <button
                                className={`btn ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                                style={{ padding: '4px 10px', fontSize: 11 }}
                                onClick={() => handleToggleStatus(u, 'isActive', !u.isActive)}
                              >
                                {u.isActive ? 'Suspend' : 'Unsuspend'}
                              </button>
                            )}
                          </>
                        )}
                        {isSelf && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>It's you</span>}
                        {!canEdit && !isSelf && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>No access</span>}
                        <Link 
                          to={`/admin/users/${u._id}/activity`} 
                          className="btn btn-secondary flex items-center gap-1" 
                          style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(20,160,125,0.1)', color: 'var(--color-teal)', border: '1px solid rgba(20,160,125,0.25)' }}
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
        )}
      </div>
    </div>
  );
};

export default UserManagement;
