// ============================================================
//  client/src/App.jsx  —  Application Root
// ============================================================

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastContainer }   from 'react-toastify';
import { useState }         from 'react';
import { Menu }             from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Sidebar from './components/Sidebar';

import { lazy, Suspense } from 'react';

const Login              = lazy(() => import('./pages/Login'));
const Register           = lazy(() => import('./pages/Register'));
const Dashboard          = lazy(() => import('./pages/Dashboard'));
const CreateTicket       = lazy(() => import('./pages/CreateTicket'));
const MyTickets          = lazy(() => import('./pages/MyTickets'));
const UserTicketStates   = lazy(() => import('./pages/UserTicketStates'));
const AllTickets         = lazy(() => import('./pages/AllTickets'));
const TicketDetails      = lazy(() => import('./pages/TicketDetails'));
const Profile            = lazy(() => import('./pages/Profile'));
const UserManagement     = lazy(() => import('./pages/UserManagement'));
const CreateAdminAccount = lazy(() => import('./pages/CreateAdminAccount'));
const UserActivity       = lazy(() => import('./pages/UserActivity'));
const Teams              = lazy(() => import('./pages/Teams'));
const Logs               = lazy(() => import('./pages/Logs'));
const TicketLogs         = lazy(() => import('./pages/TicketLogs'));
const ClientLogs         = lazy(() => import('./pages/ClientLogs'));
const ApiFlowVisualizer  = lazy(() => import('./pages/ApiFlowVisualizer'));
const Categories         = lazy(() => import('./pages/Categories'));
const TeamDashboard      = lazy(() => import('./pages/TeamDashboard'));
const TicketApproval     = lazy(() => import('./pages/TicketApproval'));
const CreateUserAccount  = lazy(() => import('./pages/CreateUserAccount'));
const PerformanceDetails = lazy(() => import('./pages/PerformanceDetails'));
const Notifications      = lazy(() => import('./pages/Notifications'));
const Agencies           = lazy(() => import('./pages/Agencies'));
const AgencyDashboard    = lazy(() => import('./pages/AgencyDashboard'));

const TeamTickets        = lazy(() => import('./pages/TeamTickets'));
const TeamMembers        = lazy(() => import('./pages/TeamMembers'));
const TeamPerformance    = lazy(() => import('./pages/TeamPerformance'));
const TeamUserTickets    = lazy(() => import('./pages/TeamUserTickets'));

import tealvueLogo from './assets/tealvue1.png';

// ── Role Guard (used INSIDE the shell, not wrapping it) ─────
const RoleGuard = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

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

// ── App ────────────────────────────────────────────────────
const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Suspense fallback={<div className="spinner-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--color-bg)' }}><div className="spinner" /></div>}>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected shell — ONE ProtectedRoute wraps the entire shell */}
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route index element={<DashboardRouter />} />
            <Route
              path="/super-admin/dashboard"
              element={
                <RoleGuard roles={['super-admin']}>
                  <Dashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <RoleGuard roles={['admin']}>
                  <Dashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/team-admin/dashboard"
              element={
                <RoleGuard roles={['team_admin']}>
                  <Dashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/team-user/dashboard"
              element={
                <RoleGuard roles={['team_user']}>
                  <Dashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RoleGuard roles={['user']}>
                  <Dashboard />
                </RoleGuard>
              }
            />
            <Route path="/tickets/create" element={<CreateTicket />} />
            <Route path="/tickets/my"     element={<MyTickets />} />
            <Route path="/tickets/states" element={<UserTicketStates />} />
            <Route path="/tickets/all"    element={<AllTickets />} />
            <Route path="/tickets/:id"    element={<TicketDetails />} />
            <Route path="/profile"        element={<Profile />} />
            <Route path="/notifications"  element={<Notifications />} />

            {/* Admin-only Routes */}
            <Route
              path="/admin/users"
              element={
                <RoleGuard roles={['admin', 'super-admin']}>
                  <UserManagement />
                </RoleGuard>
              }
            />
            <Route
              path="/super-admin/create-admin"
              element={
                <RoleGuard roles={['super-admin']}>
                  <CreateAdminAccount />
                </RoleGuard>
              }
            />
            <Route
              path="/super-admin/create-user"
              element={
                <RoleGuard roles={['super-admin']}>
                  <CreateUserAccount />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/users/:uid/activity"
              element={
                <RoleGuard roles={['admin', 'super-admin']}>
                  <UserActivity />
                </RoleGuard>
              }
            />
            <Route
              path="/super-admin/teams"
              element={
                <RoleGuard roles={['super-admin']}>
                  <Teams />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/teams"
              element={
                <RoleGuard roles={['admin', 'super-admin']}>
                  <TeamDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/teams/:id/performance"
              element={
                <RoleGuard roles={['admin', 'super-admin']}>
                  <PerformanceDetails />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/ticket-approvals"
              element={
                <RoleGuard roles={['admin', 'super-admin']}>
                  <TicketApproval />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/agencies"
              element={
                <RoleGuard roles={['admin', 'super-admin']}>
                  <Agencies />
                </RoleGuard>
              }
            />
            <Route
              path="/agencies/:id"
              element={
                <RoleGuard roles={['admin', 'super-admin']}>
                  <AgencyDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/agencies/:id/performance"
              element={
                <RoleGuard roles={['admin', 'super-admin']}>
                  <PerformanceDetails />
                </RoleGuard>
              }
            />
            <Route
              path="/logs"
              element={
                <RoleGuard roles={['admin', 'super-admin']}>
                  <Logs />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/ticket-logs"
              element={
                <RoleGuard roles={['admin', 'super-admin']}>
                  <TicketLogs />
                </RoleGuard>
              }
            />
            <Route
              path="/super-admin/client-logs"
              element={
                <RoleGuard roles={['super-admin']}>
                  <ClientLogs />
                </RoleGuard>
              }
            />
            <Route
              path="/super-admin/api-flow"
              element={
                <RoleGuard roles={['super-admin']}>
                  <ApiFlowVisualizer />
                </RoleGuard>
              }
            />
            <Route
              path="/super-admin/categories"
              element={
                <RoleGuard roles={['super-admin']}>
                  <Categories />
                </RoleGuard>
              }
            />

            {/* Team Admin Dashboard & Pages */}
            <Route
              path="/team-admin/tickets"
              element={
                <RoleGuard roles={['team_admin']}>
                  <TeamTickets />
                </RoleGuard>
              }
            />
            <Route
              path="/team-admin/members"
              element={
                <RoleGuard roles={['team_admin']}>
                  <TeamMembers />
                </RoleGuard>
              }
            />
            <Route
              path="/team-admin/performance"
              element={
                <RoleGuard roles={['team_admin']}>
                  <TeamPerformance />
                </RoleGuard>
              }
            />

            {/* Team User (Agent) Pages */}
            <Route
              path="/team-user/assigned-tickets"
              element={
                <RoleGuard roles={['team_user']}>
                  <TeamUserTickets />
                </RoleGuard>
              }
            />
            <Route
              path="/team-user/finished-tickets"
              element={
                <RoleGuard roles={['team_user']}>
                  <TeamUserTickets />
                </RoleGuard>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
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

export default App;
