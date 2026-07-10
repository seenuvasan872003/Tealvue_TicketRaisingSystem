// ============================================================
//  client/src/context/AuthContext.jsx  —  Auth State
// ============================================================
//  HELPERS:
//    isSuperAdmin  — user.role === 'super-admin'
//    isAdminLevel  — admin OR super-admin
//    updateProfile — PUT /api/auth/profile (multipart for avatar)
//    features      — array of enabled feature ids for this user
//    hasFeature    — (featureId) => boolean
// ============================================================

import { createContext, useContext, useEffect, useState } from 'react';
import { loginUser, registerUser, fetchProfile, updateProfileApi } from '../services/authApi';
import logger from '../utils/logger';
import API from '../services/authApi';
import { ROLE_DEFAULTS } from '../config/roleDefaults';
import { clearCache } from '../utils/cache';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,     setUser]     = useState(null);
  const [token,    setToken]    = useState(() => localStorage.getItem('tealue_token'));
  const [loading,  setLoading]  = useState(true);
  const [features, setFeatures] = useState([]);

  // ── Fetch user features from API ──────────────────────
  const fetchFeatures = async (role) => {
    try {
      const res = await API.get('/features/me');
      setFeatures(res.data.features || []);
    } catch (err) {
      // Fallback to role defaults if API unreachable
      setFeatures(ROLE_DEFAULTS[role] || ['dashboard']);
    }
  };

  // ── Restore session on page refresh ───────────────────────
  useEffect(() => {
    const restore = async () => {
      if (token) {
        localStorage.setItem('token', token); // Ensure standard token key matches
        logger.info('AuthContext', 'restore', 'Restoring session from stored token', { action: 'Session Restore' });
        try {
          const [profileRes, featuresRes] = await Promise.all([
            fetchProfile(),
            API.get('/features/me').catch(err => ({ data: { features: ROLE_DEFAULTS[localStorage.getItem('user_role')] || ['dashboard'] } }))
          ]);
          setUser(profileRes.data);
          localStorage.setItem('user_role', profileRes.data.role);
          setFeatures(featuresRes.data.features || []);
          logger.info('AuthContext', 'restore', `Session restored for user: ${profileRes.data.email} (${profileRes.data.role})`, { action: 'Session Restore Success' });
        } catch (err) {
          logger.error('AuthContext', 'restore', 'Session restore failed — token invalid or expired', err, {
            api: '/api/auth/profile', method: 'GET', action: 'Session Restore Failure',
          });
          logout();
        }
      }
      setLoading(false);
    };
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Login ──────────────────────────────────────────────────
  const login = async (email, password) => {
    logger.api('AuthContext', 'login', 'POST', '/api/auth/login', 'START');
    try {
      const { data } = await loginUser({ email, password });
      return data;
    } catch (err) {
      logger.error('AuthContext', 'login', 'Login FAILED', err, {
        api: '/api/auth/login', method: 'POST',
        status: err.response?.status,
        action: 'Login Failure',
      });
      throw err;
    }
  };

  // ── Login With Token (OTP successful) ─────────────────────
  const loginWithToken = async (tokenValue, userObj) => {
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('tealue_token', tokenValue);
    setToken(tokenValue);
    setUser(userObj);
    localStorage.setItem('user_role', userObj.role);
    await fetchFeatures(userObj.role);
    logger.login(userObj.name, userObj._id, `User ${userObj.name} logged in successfully via OTP.`);
  };

  // ── Register (public — always 'user' role) ─────────────────
  const register = async (name, email, password, confirmPassword) => {
    logger.api('AuthContext', 'register', 'POST', '/api/auth/register', 'START');
    try {
      const { data } = await registerUser({ name, email, password, confirmPassword });
      return data;
    } catch (err) {
      logger.error('AuthContext', 'register', 'Registration FAILED', err, {
        api: '/api/auth/register', method: 'POST',
        status: err.response?.status,
        action: 'Register Failure',
      });
      throw err;
    }
  };

  // ── Update own profile (name, department, avatar) ──────────
  const updateProfile = async (formData) => {
    logger.api('AuthContext', 'updateProfile', 'PUT', '/api/auth/profile', 'START');
    try {
      const { data } = await updateProfileApi(formData);
      setUser(data);
      logger.info('AuthContext', 'updateProfile', 'Profile updated successfully', {
        api: '/api/auth/profile', method: 'PUT', status: 200, action: 'Profile Update Success',
      });
      return data;
    } catch (err) {
      logger.error('AuthContext', 'updateProfile', 'Profile update FAILED', err, {
        api: '/api/auth/profile', method: 'PUT',
        status: err.response?.status,
        action: 'Profile Update Failure',
      });
      throw err;
    }
  };

  // ── Logout ──────────────────────────────────────────────────
  const logout = async () => {
    logger.info('AuthContext', 'logout', `User logged out${user ? ` — was: ${user.email}` : ''}`, { action: 'Logout' });
    
    try {
      await API.post('/auth/logout');
    } catch (_) {}

    // Wipe all cached data
    clearCache();
    
    localStorage.removeItem('tealue_token');
    localStorage.removeItem('user_role');
    setToken(null);
    setUser(null);
    setFeatures([]);
  };

  // ── Refresh user from API ───────────────────────────────────
  const refreshUser = async () => {
    try {
      const res = await fetchProfile();
      setUser(res.data);
      localStorage.setItem('user_role', res.data.role);
    } catch (err) {
      logger.error('AuthContext', 'refreshUser', 'Failed to refresh user', err, {
        action: 'Refresh User Failure'
      });
    }
  };

  // ── Role helpers ───────────────────────────────────────────
  const isSuperAdmin  = user?.role === 'super-admin';
  const isAdminLevel  = user?.role === 'admin' || user?.role === 'super-admin';
  const isUser        = user?.role === 'user';

  // ── Feature helper ─────────────────────────────────────────
  const hasFeature = (featureId) => features.includes(featureId);

  return (
    <AuthContext.Provider value={{
      user, token, loading, features, setFeatures,
      login, loginWithToken, register, logout, updateProfile, refreshUser,
      isSuperAdmin, isAdminLevel, isUser,
      hasFeature,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
