// ============================================================
//  client/src/App.jsx  —  Application Root
// ============================================================

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastContainer }   from 'react-toastify';
import { useState, Suspense, lazy } from 'react';
import { Menu }             from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'react-toastify/dist/ReactToastify.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ConfirmProvider } from './context/ConfirmContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Sidebar from './components/Sidebar';

import FEATURES from './config/featureList';
import PAGE_MAP from './config/pageMap';
import tealvueLogo from './assets/tealvue1.png';

const Login        = lazy(() => import('./pages/Login'));
const Register     = lazy(() => import('./pages/Register'));
const AccessDenied = lazy(() => import('./pages/AccessDenied'));
const VerifyOTP    = lazy(() => import('./pages/VerifyOTP'));
const Profile      = lazy(() => import('./pages/Profile'));
const TicketDetails = lazy(() => import('./pages/TicketDetails'));
const Notifications = lazy(() => import('./pages/Notifications'));
const PerformanceDetails = lazy(() => import('./pages/PerformanceDetails'));
const UserActivity = lazy(() => import('./pages/UserActivity'));
const UserActivityDetails = lazy(() => import('./pages/UserActivityDetails'));

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
            <span>Teal<span className="text-[var(--color-teal)]">vue</span></span>
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
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <AuthProvider>
          <DataProvider>
            <BrowserRouter>
              <Suspense fallback={<div className="spinner-container flex items-center justify-center h-screen w-screen bg-[var(--color-bg)]"><div className="spinner" /></div>}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login"    element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-register" element={<VerifyOTP type="register" />} />
                  <Route path="/verify-login"    element={<VerifyOTP type="login" />} />
                  <Route path="/access-denied" element={<AccessDenied />} />
      
                  {/* Protected shell — ONE ProtectedRoute wraps the entire shell */}
                  <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                    <Route index element={<DashboardRouter />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/tickets/:id" element={<TicketDetails />} />
                    <Route path="/teams/:id/performance" element={<PerformanceDetails />} />
                    <Route path="/admin/users/:id/activity" element={<UserActivity />} />
                    <Route path="/super-admin/users/:id/activity" element={<UserActivity />} />
                    {/* User Activity Tracking — detail pages */}
                    <Route path="/super-admin/user-activity/:uid" element={<UserActivityDetails />} />
                    <Route path="/admin/user-activity/:uid"       element={<UserActivityDetails />} />
                    <Route path="/team-admin/user-activity/:uid"  element={<UserActivityDetails />} />
                    {dynamicRoutes}
                  </Route>
      
                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </DataProvider>
      
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
      </ConfirmProvider>
    </QueryClientProvider>
  );
};

export default App;
