// ============================================================
//  client/src/App.jsx  —  Application Root
// ============================================================

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastContainer }   from 'react-toastify';
import { useState, Suspense, lazy } from 'react';
import { Menu }             from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Sidebar from './components/Sidebar';

import FEATURES from './config/featureList';
import PAGE_MAP from './config/pageMap';
import tealvueLogo from './assets/tealvue1.png';

const Login        = lazy(() => import('./pages/Login'));
const Register     = lazy(() => import('./pages/Register'));
const AccessDenied = lazy(() => import('./pages/AccessDenied'));
const Profile      = lazy(() => import('./pages/Profile'));

// ── App Shell — wraps all authenticated pages ──────────────
const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Dark overlay behind sidebar on mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        {/* Mobile sticky header */}
        <div className="mobile-header">
          <div className="mobile-logo">
            <img src={tealvueLogo} alt="Tealvue" width="32" height="32" />
            <span>Teal<span style={{ color: 'var(--color-teal)' }}>vue</span></span>
          </div>
          <button
            className="mobile-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
        </div>

        <Outlet />
      </div>
    </div>
  );
};

// ── Dashboard Router — redirects based on role ───────────────────
const DashboardRouter = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  
  switch (user.role) {
    case 'super-admin':
      return <Navigate to="/super-admin/dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'team_admin':
      return <Navigate to="/team-admin/dashboard" replace />;
    case 'team_user':
      return <Navigate to="/team-user/dashboard" replace />;
    case 'user':
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

// ── Generate Dynamic Routes ─────────────────────────────────
const generateDynamicRoutes = () => {
  const routes = [];
  FEATURES.forEach(feature => {
    Object.entries(feature.paths).forEach(([role, path]) => {
      const PageComponent = PAGE_MAP[feature.id]?.[role];
      if (!PageComponent) return;

      routes.push(
        <Route
          key={`${feature.id}-${role}`}
          path={path}
          element={
            <ProtectedRoute featureId={feature.id} pathRole={role}>
              <PageComponent />
            </ProtectedRoute>
          }
        />
      );
    });
  });
  return routes;
};

// ── App ────────────────────────────────────────────────────
const App = () => {
  const dynamicRoutes = generateDynamicRoutes();

  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="spinner-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--color-bg)' }}><div className="spinner" /></div>}>
          <Routes>
            {/* Public routes */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/access-denied" element={<AccessDenied />} />

            {/* Protected shell — ONE ProtectedRoute wraps the entire shell */}
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<DashboardRouter />} />
              <Route path="/profile" element={<Profile />} />
              {dynamicRoutes}
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>

      <ToastContainer
        position="bottom-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover
        theme="dark"
      />
    </AuthProvider>
  );
};

export default App;
