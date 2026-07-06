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
  const [email,      setEmail]      = useState(user?.email      || '');
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
      fd.append('email', email.trim());
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

      <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-5 items-start max-w-[900px]">

        {/* ── Left Column: Avatar + Info Card ───────────────────── */}
        <div className="card px-7 py-6">
          <form onSubmit={handleSave}>
            {/* Avatar row */}
            <div className="flex items-center gap-5 mb-6">
              <div className="avatar-upload-wrap">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={user?.name} className="avatar-img" />
                ) : (
                  <div className="avatar-initials">{user?.name?.[0]?.toUpperCase()}</div>
                )}
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
                      className="hidden"
                      onChange={handleAvatarPick}
                    />
                  </>
              </div>

              <div>
                <h2 className="text-lg font-bold">{user?.name}</h2>
                <div className="flex items-center gap-2 mt-[6px]">
                  <span className={`badge ${roleBadge} inline-flex items-center gap-1`}>
                    <RoleIcon size={11} /> {roleName}
                  </span>
                  {!user?.isActive && (
                    <span className="badge bg-[rgba(248,81,73,0.1)] text-[#f85149] border border-solid border-[rgba(248,81,73,0.2)] text-[11px]">
                      Suspended
                    </span>
                  )}
                  {user?.securityFlags > 0 && (
                    <span className="badge w-fit bg-[#2a1a1a] text-[#f87171] border-[0.5px] border-solid border-[#4b1e1e] text-[11px] px-2 py-[2px] rounded-[20px] inline-flex items-center gap-1">
                      <ShieldCheck size={11} /> {user.securityFlags}/5
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-[var(--color-text-muted)] mt-[6px] flex items-center gap-1">
                  <Mail size={11} className="shrink-0" />
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Name field */}
            <div className="profile-form-row">
              <label className="form-label flex items-center gap-1.5">
                <User size={14} className="shrink-0" />
                Full Name
              </label>
              <input
                id="profile-name"
                className={`form-input ${nameErr ? 'input-error' : ''}`}
                value={name}
                onChange={(e) => { setName(e.target.value); setNameErr(''); }}
                placeholder="Your name"
                maxLength={50}
              />
              {nameErr && <div className="form-error">{nameErr}</div>}
            </div>

            {/* Email field */}
            <div className="profile-form-row">
              <label className="form-label flex items-center gap-1.5">
                <Mail size={14} className="shrink-0" />
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
              />
            </div>

            {/* Info rows (read-only) */}
            <div className="border-t border-solid border-[var(--color-border)] pt-4 mt-1">
              {[
                { label: 'Member Since', value: formatDate(user?.createdAt), Icon: Calendar },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="flex justify-between items-center py-[9px] border-b border-solid border-[var(--color-border-soft)]">
                  <span className="text-[12px] text-[var(--color-text-muted)] flex items-center gap-[6px]">
                    <Icon size={12} /> {label}
                  </span>
                  <span className="text-[13px]">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-[10px] mt-5 flex-wrap">
              <button
                id="profile-save"
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                <Save size={14} />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
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
        <div className="flex flex-col gap-4">
          
          {/* Change Password Card */}
          <div className="card px-7 py-6">
            <h3 className="text-[14px] font-semibold mb-1 flex items-center gap-[6px]">
              <Lock size={14} className="mr-[6px] align-middle text-[var(--color-text-muted)]" />
              Change Password
            </h3>
            <p className="text-[12px] text-[var(--color-text-muted)] mb-[18px]">
              Min 6 characters
            </p>
            <form onSubmit={handlePwChange}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="relative">
                  <input
                    id="profile-new-password"
                    type={pwVisible ? 'text' : 'password'}
                    className="form-input pr-[40px]"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setPwVisible((v) => !v)}
                    className="absolute right-[10px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[var(--color-text-muted)]"
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
                className="btn btn-primary w-full justify-center mt-4"
                disabled={pwSaving || !newPw || !confirmPw}
              >
                <Lock size={14} />
                {pwSaving ? 'Changing…' : 'Change Password'}
              </button>
          </form>
        </div>

      </div>
      </div>
    </div>
  );
};

export default Profile;
