// ============================================================
//  client/src/routes/ProtectedRoute.jsx  —  Route Guards
// ============================================================
//  EXPORTS:
//    ProtectedRoute    — any logged-in user (redirect to /login if not)
//    AdminRoute        — admin OR super-admin (redirect to /dashboard if user)
//    SuperAdminRoute   — super-admin only (redirect to /dashboard if admin/user)
// ============================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';

// ── Loading spinner ────────────────────────────────────────
const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-bg)',
  }}>
    <div className="spinner" style={{ width: 32, height: 32 }} />
  </div>
);

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) {
    logger.warn('ProtectedRoute', 'ProtectedRoute', 'Access denied — no authenticated user, redirecting to /login', {
      action: 'Protected Route Guard — Unauthenticated',
    });
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    logger.warn('ProtectedRoute', 'ProtectedRoute', `Access denied — user role "${user.role}" not in allowed roles [${roles.join(', ')}]`, {
      action: 'Protected Route Guard — Insufficient Role',
    });
    return <Navigate to="/dashboard" replace />;
  }
  logger.info('ProtectedRoute', 'ProtectedRoute', `Route access granted — user: ${user.email} | role: ${user.role}`, {
    action: 'Protected Route Guard — Access Granted',
  });
  return children;
};

export default ProtectedRoute;
