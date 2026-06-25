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

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('tealue_token'));
  const [loading, setLoading] = useState(true);

  // ── Restore session on page refresh ───────────────────
  useEffect(() => {
    const restore = async () => {
      if (token) {
        try {
          const { data } = await fetchProfile();
          setUser(data);
        } catch {
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
    const { data } = await loginUser({ email, password });
    localStorage.setItem('tealue_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  // ── Register (public — always 'user' role) ─────────────
  const register = async (name, email, password) => {
    const { data } = await registerUser({ name, email, password });
    localStorage.setItem('tealue_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  // ── Update own profile (name, department, avatar) ──────
  const updateProfile = async (formData) => {
    const { data } = await updateProfileApi(formData);
    setUser(data);
    return data;
  };

  // ── Logout ──────────────────────────────────────────────
  const logout = () => {
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
