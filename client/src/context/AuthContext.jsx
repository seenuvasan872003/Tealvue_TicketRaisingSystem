// ============================================================
//  client/src/context/AuthContext.jsx  —  Auth State
// ============================================================
//  HELPERS:
//    isSuperAdmin  — user.role === 'super-admin'
//    isAdminLevel  — admin OR super-admin
//    updateProfile — PUT /api/auth/profile (multipart for avatar)
// ============================================================

import { createContext, useContext, useEffect, useState } from 'react';
import { loginUser, registerUser, fetchProfile, updateProfileApi } from '../services/authApi';
import logger from '../utils/logger';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('tealue_token'));
  const [loading, setLoading] = useState(true);

  // ── Restore session on page refresh ───────────────────
  useEffect(() => {
    const restore = async () => {
      if (token) {
        localStorage.setItem('token', token); // Ensure standard token key matches
        logger.info('AuthContext', 'restore', 'Restoring session from stored token', { action: 'Session Restore' });
        try {
          const { data } = await fetchProfile();
          setUser(data);
          logger.info('AuthContext', 'restore', `Session restored for user: ${data.email} (${data.role})`, { action: 'Session Restore Success' });
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

  // ── Login ──────────────────────────────────────────────
  const login = async (email, password) => {
    logger.api('AuthContext', 'login', 'POST', '/api/auth/login', 'START');
    try {
      const { data } = await loginUser({ email, password });
      // Set the standard token first so getUserFromToken can decode it
      localStorage.setItem('token', data.token);
      localStorage.setItem('tealue_token', data.token);
      setToken(data.token);
      setUser(data.user);
      logger.login(data.user.name, data.user._id, `User ${data.user.name} logged in successfully.`);
      return data.user;
    } catch (err) {
      logger.error('AuthContext', 'login', 'Login FAILED', err, {
        api: '/api/auth/login', method: 'POST',
        status: err.response?.status,
        action: 'Login Failure',
      });
      throw err;
    }
  };

  // ── Register (public — always 'user' role) ─────────────
  const register = async (name, email, password) => {
    logger.api('AuthContext', 'register', 'POST', '/api/auth/register', 'START');
    try {
      const { data } = await registerUser({ name, email, password });
      localStorage.setItem('tealue_token', data.token);
      setToken(data.token);
      setUser(data.user);
      logger.info('AuthContext', 'register', `Registration SUCCESS — user: ${data.user.email}`, {
        api: '/api/auth/register', method: 'POST', status: 200, action: 'Register Success',
      });
      return data.user;
    } catch (err) {
      logger.error('AuthContext', 'register', 'Registration FAILED', err, {
        api: '/api/auth/register', method: 'POST',
        status: err.response?.status,
        action: 'Register Failure',
      });
      throw err;
    }
  };

  // ── Update own profile (name, department, avatar) ──────
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

  // ── Logout ──────────────────────────────────────────────
  const logout = () => {
    logger.info('AuthContext', 'logout', `User logged out${user ? ` — was: ${user.email}` : ''}`, { action: 'Logout' });
    localStorage.removeItem('tealue_token');
    setToken(null);
    setUser(null);
  };

  // ── Role helpers ───────────────────────────────────────
  const isSuperAdmin  = user?.role === 'super-admin';
  const isAdminLevel  = user?.role === 'admin' || user?.role === 'super-admin';
  const isUser        = user?.role === 'user';

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, logout, updateProfile,
      isSuperAdmin, isAdminLevel, isUser,
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
