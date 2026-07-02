// ============================================================
//  client/src/components/Sidebar.jsx  —  Navigation Sidebar
// ============================================================
//  DYNAMIC FEATURE-BASED NAVIGATION:
//    Each nav item is controlled by a featureId.
//    The hasFeature(id) helper from AuthContext gates each link.
//    Super Admin additionally sees the Roles & Features management link.
// ============================================================

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Ticket,
  LayoutDashboard,
  Plus,
  User,
  LogOut,
  ShieldCheck,
  Users,
  UserPlus,
  Crown,
  X,
  FileText,
  Clock,
  CheckCircle,
  Activity,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import tealvueLogo from '../assets/tealvue1.png';
import API from '../services/authApi';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isAdminLevel, isSuperAdmin, hasFeature } = useAuth();
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    const fetchTeam = async () => {
      if (user?.role === 'team_admin' || user?.role === 'team_user') {
        try {
          const res = await API.get('/teams/mine');
          setTeamName(res.data?.name || '');
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchTeam();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onClose) onClose();
  };

  const closeMobile = () => onClose && onClose();
  
  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'super-admin': return '/super-admin/dashboard';
      case 'admin': return '/admin/dashboard';
      case 'team_admin': return '/team-admin/dashboard';
      case 'team_user': return '/team-user/dashboard';
      default: return '/dashboard';
    }
  };

  // Role display helpers
  const roleName  = user?.role === 'super-admin' ? 'Super Admin' :
                    user?.role === 'admin'        ? 'Admin' :
                    user?.role === 'team_admin'   ? 'Team Admin' :
                    user?.role === 'team_user'    ? 'Team Agent' : 'User';
  const RoleIcon  = user?.role === 'super-admin' ? Crown :
                    user?.role === 'admin'        ? ShieldCheck :
                    user?.role === 'team_admin'   ? ShieldCheck : User;
  const roleColor = user?.role === 'super-admin' ? 'var(--color-progress)' :
                    user?.role === 'admin'        ? 'var(--color-teal)' :
                    user?.role === 'team_admin'   ? 'var(--color-teal)' : 'var(--color-text-muted)';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* ── Logo ─────────────────────────────────────── */}
      <div className="sidebar-logo" style={{ justifyContent: 'space-between', borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={tealvueLogo} alt="Tealvue Logo" width="28" height="28" style={{ height: 28, width: 28 }} />
          <span>Teal<span style={{ color: 'var(--color-teal)' }}>vue</span></span>
        </div>
        {/* Mobile close button */}
        <button onClick={closeMobile} className="mobile-toggle" id="sidebar-close-btn"
          style={{ display: 'none' }}>
          <X size={18} />
        </button>
      </div>

      {/* ── User Profile & Role Top Badge (Clickable to open profile) ── */}
      <div 
        onClick={() => {
          navigate('/profile');
          closeMobile();
        }}
        className="card-hover"
        style={{
          padding: '12px 20px 16px 20px',
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(255,255,255,0.015)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          cursor: 'pointer',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden', flex: 1 }}>
          {/* Avatar */}
          {user?.avatar ? (
            <img
              src={`${BASE_URL}${user.avatar}`}
              alt={user.name}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                objectFit: 'cover', border: '2px solid var(--color-border)', flexShrink: 0,
              }}
            />
          ) : (
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))',
              color: '#fff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}

          <div style={{ overflow: 'hidden', flex: 1 }}>
            {(user?.role === 'team_admin' || user?.role === 'team_user') ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {teamName || 'Loading Team...'}
                </div>
                <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: roleColor, fontWeight: 500 }}>
                  <RoleIcon size={11} color={roleColor} />
                  {roleName} ({user.name})
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: roleColor, fontWeight: 500 }}>
                  <RoleIcon size={11} color={roleColor} />
                  {roleName}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notification bell on the right */}
        <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
          <NotificationBell />
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────── */}
      <nav className="sidebar-nav" onClick={closeMobile}>
        <span className="nav-section-label">Main</span>

        {/* Dashboard — all roles */}
        {hasFeature('dashboard') && (
          <NavLink to={getDashboardLink()} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
        )}

        {/* ── User Navigation ─────────────────────────── */}
        {(hasFeature('my_tickets') || hasFeature('create_ticket') || hasFeature('ticket_states') || hasFeature('all_tickets')) && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>Tickets</span>
            {hasFeature('my_tickets') && (
              <NavLink to="/tickets/mytickets" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <Ticket size={16} />
                My Tickets
              </NavLink>
            )}
            {hasFeature('create_ticket') && (
              <NavLink to="/tickets/create" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <Plus size={16} />
                Create Ticket
              </NavLink>
            )}
            {hasFeature('ticket_states') && (
              <NavLink to="/tickets/states" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <Clock size={16} />
                Show Ticket States
              </NavLink>
            )}
            {hasFeature('all_tickets') && (
              <NavLink to="/tickets/all" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <Ticket size={16} />
                All Tickets
              </NavLink>
            )}
          </>
        )}

        {/* ── Management ────────────────────────────── */}
        {(hasFeature('all_users') || hasFeature('create_user') || hasFeature('create_admin') || hasFeature('roles_features')) && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>Management</span>
            {hasFeature('all_users') && (
              <NavLink to="/admin/users" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <Users size={16} />
                All Users
              </NavLink>
            )}
            {hasFeature('create_user') && (
              <NavLink to="/super-admin/create-user" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <UserPlus size={16} />
                Create User
              </NavLink>
            )}
            {hasFeature('create_admin') && (
              <NavLink to="/super-admin/create-admin" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <UserPlus size={16} />
                Create Admin
              </NavLink>
            )}
            {hasFeature('roles_features') && (
              <NavLink to="/super-admin/roles" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <Layers size={16} />
                Roles & Features
              </NavLink>
            )}
          </>
        )}
        
        {/* ── Teams ─────────────────────────────────── */}
        {(hasFeature('team_dashboard') || hasFeature('teams_management')) && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>Teams</span>
            {hasFeature('team_dashboard') && (
              <NavLink to="/admin/teams" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <LayoutDashboard size={16} />
                Team Dashboard
              </NavLink>
            )}
            {hasFeature('teams_management') && (
              <NavLink to="/super-admin/teams" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <ShieldCheck size={16} />
                Teams
              </NavLink>
            )}
          </>
        )}

        {/* ── Ticket Management ─────────────────────── */}
        {hasFeature('ticket_approval') && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>Ticket Management</span>
            <NavLink to="/admin/ticket-approvals" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Ticket size={16} />
              Ticket Approval
            </NavLink>
          </>
        )}
        
        {/* ── Team Admin Navigation ───────────────────── */}
        {(hasFeature('team_tickets') || hasFeature('team_members') || hasFeature('team_performance')) && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>Team Management</span>
            {hasFeature('team_tickets') && (
              <NavLink to="/team-admin/tickets" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <Ticket size={16} />
                Team Tickets
              </NavLink>
            )}
            {hasFeature('team_members') && (
              <NavLink to="/team-admin/members" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <Users size={16} />
                Team Members
              </NavLink>
            )}
            {hasFeature('team_performance') && (
              <NavLink to="/team-admin/performance" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <LayoutDashboard size={16} />
                Team Performance
              </NavLink>
            )}
          </>
        )}

        {/* ── Team User (Agent) Navigation ────────────── */}
        {(hasFeature('assigned_tickets') || hasFeature('finished_tickets')) && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>My Work</span>
            {hasFeature('assigned_tickets') && (
              <NavLink to="/team-user/assigned-tickets" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <Ticket size={16} />
                Assigned Tickets
              </NavLink>
            )}
            {hasFeature('finished_tickets') && (
              <NavLink to="/team-user/finished-tickets" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <CheckCircle size={16} />
                Finished Tickets
              </NavLink>
            )}
          </>
        )}

        {/* ── Combined Monitoring Navigation ────────── */}
        {(hasFeature('ticket_lifecycle_logs') || hasFeature('activity_logs') || hasFeature('client_logs')) && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>Monitoring</span>
            {hasFeature('ticket_lifecycle_logs') && (
              <NavLink to="/admin/ticket-logs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <FileText size={16} />
                Ticket Lifecycle Logs
              </NavLink>
            )}
            {hasFeature('activity_logs') && (
              <NavLink to="/logs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <FileText size={16} />
                Activity Logs
              </NavLink>
            )}
            {hasFeature('client_logs') && (
              <NavLink to="/super-admin/client-logs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <FileText size={16} />
                Client Logs
              </NavLink>
            )}
          </>
        )}
      </nav>

      {/* ── Footer — Logout Only ────────── */}
      <div className="sidebar-footer">
        {/* Logout */}
        <button
          id="sidebar-logout"
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={handleLogout}
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
