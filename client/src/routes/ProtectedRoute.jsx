// ============================================================
//  client/src/routes/ProtectedRoute.jsx  —  Route Guards
// ============================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FEATURES from '../config/featureList';

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

const ProtectedRoute = ({ children, featureId, pathRole }) => {
  const { user, features, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Normalize super-admin matching format
  const normalizedUserRole = user.role === 'super-admin' ? 'super-admin' : user.role;
  const normalizedPathRole = pathRole === 'super-admin' ? 'super-admin' : pathRole;

  if (normalizedPathRole && normalizedUserRole !== normalizedPathRole) {
    return (
      <Navigate
        to="/access-denied"
        state={{ reason: 'WRONG_ROLE', featureId }}
        replace
      />
    );
  }

  if (!featureId) {
    return children;
  }

  const feature = FEATURES.find(f => f.id === featureId);

  if (!feature) {
    return <Navigate to="/access-denied" replace />;
  }

  if (!features.includes(featureId)) {
    return (
      <Navigate
        to="/access-denied"
        state={{ reason: 'FEATURE_NOT_ASSIGNED', featureId }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
