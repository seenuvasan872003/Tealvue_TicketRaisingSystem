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
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

export default ProtectedRoute;
