// ============================================================
//  client/src/pages/Profile.jsx  —  User Profile Page
// ============================================================
//  FEATURES:
//    - Avatar display (image or initials circle)
//    - Avatar upload via file picker
//    - Name + department edit form
//    - Password change with strength meter
//    - Role badge (User / Admin / Super Admin)
//    - Account status display
//
//  API CALLS:
//    PUT /api/auth/profile  → updateProfile (multipart/form-data)
// ============================================================

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, ShieldCheck, Crown, Mail, Calendar, LogOut,
  Plus, Camera, Save, Eye, EyeOff, Lock, Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import logger from '../utils/logger';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ── Password strength helper ──────────────────────────────
const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' };
  if (pw.length < 6) {
    return { score: 1, label: 'Too Short', color: '#f85149' };
  }
  return { score: 4, label: 'Strong', color: '#14A07D' };
};

const Profile = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate  = useNavigate();
  const fileRef   = useRef(null);

  // ── Edit profile state ────────────────────────────────
  const [name,       setName]       = useState(user?.name       || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPrev, setAvatarPrev] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [nameErr,    setNameErr]    = useState('');

  // ── Password change state ─────────────────────────────
  const [pwVisible,  setPwVisible]  = useState(false);
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [pwSaving,   setPwSaving]   = useState(false);

  const pwStrength = getPasswordStrength(newPw);

  const handleLogout = () => {
    logger.info('Profile', 'handleLogout', 'User initiated logout from Profile page', { action: 'Manual Logout' });
    logout();
    navigate('/login');
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

  // ── Avatar file picked ────────────────────────────────
  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Avatar must be under 5MB'); return; }
    setAvatarFile(file);
    setAvatarPrev(URL.createObjectURL(file));
  };

  // ── Save profile ──────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setNameErr('');
    if (!name.trim() || name.length < 2 || name.length > 50) {
      setNameErr('Name must be 2–50 characters');
      logger.warn('Profile', 'handleSave', 'Profile save validation failed — name invalid', { action: 'Profile Save Validation Failure' });
      return;
    }

    setSaving(true);
    logger.info('Profile', 'handleSave', 'Saving profile changes', { api: '/api/auth/profile', method: 'PUT', action: 'Profile Save Start' });
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('department', department.trim());
      if (avatarFile) fd.append('avatar', avatarFile);

      await updateProfile(fd);
      setAvatarFile(null);
      toast.success('Profile updated successfully');
      logger.info('Profile', 'handleSave', 'Profile saved successfully', { api: '/api/auth/profile', method: 'PUT', status: 200, action: 'Profile Save Success' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
      logger.error('Profile', 'handleSave', 'Profile save FAILED', err, { api: '/api/auth/profile', method: 'PUT', status: err?.response?.status, action: 'Profile Save Failure' });
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ───────────────────────────────
  const handlePwChange = async (e) => {
    e.preventDefault();
    if (pwStrength.score < 4) {
      toast.error('Password does not meet strength requirements');
      logger.warn('Profile', 'handlePwChange', 'Password change failed — strength requirement not met', { action: 'Password Change Validation Failure' });
      return;
    }
    if (newPw !== confirmPw) {
      toast.error('Passwords do not match');
      logger.warn('Profile', 'handlePwChange', 'Password change failed — passwords do not match', { action: 'Password Change Validation Failure' });
      return;
    }
    setPwSaving(true);
    logger.info('Profile', 'handlePwChange', 'Changing password', { api: '/api/auth/profile', method: 'PUT', action: 'Password Change Start' });
    try {
      const fd = new FormData();
      fd.append('name', user.name);
      fd.append('password', newPw);
      await updateProfile(fd);
      setNewPw('');
      setConfirmPw('');
      toast.success('Password changed successfully');
      logger.info('Profile', 'handlePwChange', 'Password changed successfully', { api: '/api/auth/profile', method: 'PUT', status: 200, action: 'Password Change Success' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
      logger.error('Profile', 'handlePwChange', 'Password change FAILED', err, { api: '/api/auth/profile', method: 'PUT', status: err?.response?.status, action: 'Password Change Failure' });
    } finally {
      setPwSaving(false);
    }
  };

  // ── Role display ──────────────────────────────────────
  const roleName  = user?.role === 'super-admin' ? 'Super Admin' :
                    user?.role === 'admin'        ? 'Admin' : 'User';
  const RoleIcon  = user?.role === 'super-admin' ? Crown :
                    user?.role === 'admin'        ? ShieldCheck : User;
  const roleBadge = user?.role === 'super-admin' ? 'badge-progress' :
                    user?.role === 'admin'        ? 'badge-teal' : 'badge-open';

  const avatarSrc = avatarPrev ||
    (user?.avatar ? `${BASE_URL}${user.avatar}` : null);

  return (
    <div className="page-body fade-in">
      {/* ── Page Header ─────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Manage your account details</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, alignItems: 'start', maxWidth: 900 }}>

        {/* ── Left Column: Avatar + Info Card ───────────────────── */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <form onSubmit={handleSave}>
            {/* Avatar row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
              <div className="avatar-upload-wrap">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={user?.name} className="avatar-img" />
                ) : (
                  <div className="avatar-initials">{user?.name?.[0]?.toUpperCase()}</div>
                )}
                {(user?.role === 'admin' || user?.role === 'super-admin') && (
                  <>
                    <button
                      type="button"
                      className="avatar-upload-btn"
                      onClick={() => fileRef.current?.click()}
                      title="Change avatar"
                    >
                      <Camera size={12} />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarPick}
                    />
                  </>
                )}
              </div>

              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{user?.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span className={`badge ${roleBadge}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <RoleIcon size={11} /> {roleName}
                  </span>
                  {!user?.isActive && (
                    <span className="badge" style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149', border: '1px solid rgba(248,81,73,0.2)', fontSize: 11 }}>
                      Suspended
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
                  <Mail size={11} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Name field */}
            <div className="form-group">
              <label className="form-label">
                <User size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                Full Name
              </label>
              <input
                id="profile-name"
                className={`form-input ${nameErr ? 'input-error' : ''}`}
                value={name}
                onChange={(e) => { setName(e.target.value); setNameErr(''); }}
                placeholder="Your name"
                maxLength={50}
                disabled={user?.role !== 'admin' && user?.role !== 'super-admin'}
              />
              {nameErr && <div className="form-error">{nameErr}</div>}
            </div>

            {/* Department field */}
            <div className="form-group">
              <label className="form-label">
                <Building2 size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                Department <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="profile-department"
                className="form-input"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering, Support"
                maxLength={80}
                disabled={user?.role !== 'admin' && user?.role !== 'super-admin'}
              />
            </div>

            {/* Info rows (read-only) */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 4 }}>
              {[
                { label: 'Email', value: user?.email, Icon: Mail },
                { label: 'Member Since', value: formatDate(user?.createdAt), Icon: Calendar },
              ].map(({ label, value, Icon }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--color-border-soft)' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={12} /> {label}
                  </span>
                  <span style={{ fontSize: 13 }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {(user?.role === 'admin' || user?.role === 'super-admin') && (
                <button
                  id="profile-save"
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  <Save size={14} />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              )}
              {user?.role === 'user' && (
                <button type="button" className="btn btn-primary" onClick={() => navigate('/tickets/create')}>
                  <Plus size={14} /> New Ticket
                </button>
              )}

              <button id="profile-logout" className="btn btn-danger" onClick={handleLogout}>
                <LogOut size={14} /> Sign out
              </button>
            </div>
            
          </form>
        </div>

        {/* ── Right Column: Password & Action Cards ────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Change Password Card */}
          <div className="card" style={{ padding: '24px 28px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              <Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--color-text-muted)' }} />
              Change Password
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 18 }}>
              Min 6 characters
            </p>
            <form onSubmit={handlePwChange}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="profile-new-password"
                    type={pwVisible ? 'text' : 'password'}
                    className="form-input"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Enter new password"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setPwVisible((v) => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  >
                    {pwVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {newPw && (
                  <>
                    <div className="pw-strength-bar" style={{ width: `${(pwStrength.score / 4) * 100}%`, background: pwStrength.color }} />
                    <div className="pw-strength-label" style={{ color: pwStrength.color }}>{pwStrength.label}</div>
                  </>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  id="profile-confirm-password"
                  type="password"
                  className="form-input"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
              <button
                id="profile-change-pw"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
                disabled={pwSaving || !newPw || !confirmPw}
              >
                <Lock size={14} />
                {pwSaving ? 'Changing…' : 'Change Password'}
              </button>
          </form>
        </div>

        {/* ── Actions ──────────────────────────────── */}
        {/* <div className="card" style={{ padding: '16px 24px' }}>
          <button id="profile-logout" className="btn btn-danger" onClick={handleLogout}>
            <LogOut size={14} /> Sign out
          </button>
        </div> */}
      </div>
      </div>
    </div>
  );
};

export default Profile;
