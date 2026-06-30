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

import Login              from './pages/Login';
import Register           from './pages/Register';
import Dashboard          from './pages/Dashboard';
import CreateTicket       from './pages/CreateTicket';
import MyTickets          from './pages/MyTickets';
import UserTicketStates   from './pages/UserTicketStates';
import AllTickets         from './pages/AllTickets';
import TicketDetails      from './pages/TicketDetails';
import Profile            from './pages/Profile';
import UserManagement     from './pages/UserManagement';
import CreateAdminAccount from './pages/CreateAdminAccount';
import UserActivity       from './pages/UserActivity';
import Teams              from './pages/Teams';
import Logs               from './pages/Logs';
import TicketLogs         from './pages/TicketLogs';
import ClientLogs         from './pages/ClientLogs';
import TeamDashboard      from './pages/TeamDashboard';
import TicketApproval     from './pages/TicketApproval';
import CreateUserAccount  from './pages/CreateUserAccount';
import PerformanceDetails from './pages/PerformanceDetails';
import Notifications      from './pages/Notifications';
import Agencies           from './pages/Agencies';
import AgencyDashboard    from './pages/AgencyDashboard';

import TeamTickets        from './pages/TeamTickets';
import TeamMembers        from './pages/TeamMembers';
import TeamPerformance    from './pages/TeamPerformance';
import TeamUserTickets    from './pages/TeamUserTickets';

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
            <img src={tealvueLogo} alt="Tealvue" />
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
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected shell — ONE ProtectedRoute wraps the entire shell */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index                  element={<DashboardRouter />} />
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
          <Route
            path="/tickets"
            element={
              <RoleGuard roles={['user']}>
                <MyTickets />
              </RoleGuard>
            }
          />
          <Route
            path="/tickets/states"
            element={
              <RoleGuard roles={['user']}>
                <UserTicketStates />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/tickets"
            element={
              <RoleGuard roles={['admin']}>
                <AllTickets />
              </RoleGuard>
            }
          />
          <Route path="/tickets/create" element={<CreateTicket />} />
          <Route path="/tickets/:id"    element={<TicketDetails />} />
          <Route path="/profile"        element={<Profile />} />
          <Route path="/notifications"  element={<Notifications />} />

          {/* Admin-only and Super-Admin pages */}
          <Route
            path="/super-admin/tickets"
            element={
              <RoleGuard roles={['super-admin']}>
                <TicketApproval />
              </RoleGuard>
            }
          />
          <Route
            path="/super-admin/users"
            element={
              <RoleGuard roles={['admin', 'super-admin']}>
                <UserManagement />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/users/:id/activity"
            element={
              <RoleGuard roles={['admin', 'super-admin']}>
                <UserActivity />
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
            path="/admin/agencies"
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

          {/* Team Agent Pages */}
          <Route
            path="/team-user/tickets"
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
