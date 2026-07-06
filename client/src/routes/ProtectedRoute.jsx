// ============================================================
//  client/src/routes/ProtectedRoute.jsx  —  Route Guards
// ============================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FEATURES from '../config/featureList';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
    <div className="spinner w-8 h-8" />
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
