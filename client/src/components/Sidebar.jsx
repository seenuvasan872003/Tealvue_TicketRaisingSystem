// ============================================================
//  client/src/components/Sidebar.jsx  —  Navigation Sidebar
// ============================================================
//  LUCIDE ICONS USED:
//    Ticket, LayoutDashboard, Plus, User, LogOut, ShieldCheck,
//    Users, UserPlus, Crown, X, ChevronRight
//
//  ROLE-BASED NAV:
//    user        → Dashboard, Create Ticket, My Tickets, Profile
//    admin       → Dashboard, All Tickets, Users, Profile
//    super-admin → Dashboard, All Tickets, Users, Create Admin, Profile
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import tealvueLogo from '../assets/tealvue1.png';
import API from '../services/authApi';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isAdminLevel, isSuperAdmin } = useAuth();
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

        <NavLink to={getDashboardLink()} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        {/* User-only navigation */}
        {user?.role === 'user' && (
          <>
            <NavLink to="/tickets/my" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Ticket size={16} />
              My Tickets
            </NavLink>
            <NavLink to="/tickets/create" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Plus size={16} />
              Create Ticket
            </NavLink>
            <NavLink to="/tickets/states" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Clock size={16} />
              Show Ticket States
            </NavLink>
          </>
        )}

        {/* Admin-only navigation */}
        {user?.role === 'admin' && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>Tickets</span>
            <NavLink to="/tickets/all" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Ticket size={16} />
              All Tickets
            </NavLink>

            <span className="nav-section-label" style={{ marginTop: 8 }}>Management</span>
            <NavLink to="/admin/users" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Users size={16} />
              All Users
            </NavLink>
            
            <span className="nav-section-label" style={{ marginTop: 8 }}>Teams</span>
            <NavLink to="/admin/teams" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <LayoutDashboard size={16} />
              Team Dashboard
            </NavLink>
            
            <span className="nav-section-label" style={{ marginTop: 8 }}>Monitoring</span>
            <NavLink to="/admin/ticket-logs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <FileText size={16} />
              Ticket Lifecycle Logs
            </NavLink>
            <NavLink to="/logs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <FileText size={16} />
              Activity Logs
            </NavLink>
          </>
        )}

        {/* Super Admin-only navigation */}
        {user?.role === 'super-admin' && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>Ticket Management</span>
            <NavLink to="/admin/ticket-approvals" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Ticket size={16} />
              Ticket Approval
            </NavLink>

            <span className="nav-section-label" style={{ marginTop: 8 }}>Management</span>
            <NavLink to="/admin/users" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Users size={16} />
              All Users
            </NavLink>
            <NavLink to="/super-admin/create-user" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <UserPlus size={16} />
              Create User
            </NavLink>
            <NavLink to="/super-admin/create-admin" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <UserPlus size={16} />
              Create Admin
            </NavLink>
            <NavLink to="/super-admin/teams" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <ShieldCheck size={16} />
              Teams
            </NavLink>

            <span className="nav-section-label" style={{ marginTop: 8 }}>Monitoring</span>
            <NavLink to="/admin/teams" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <LayoutDashboard size={16} />
              Team Dashboard
            </NavLink>
            <NavLink to="/admin/ticket-logs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <FileText size={16} />
              Ticket Lifecycle Logs
            </NavLink>
            <NavLink to="/logs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <FileText size={16} />
              Activity Logs
            </NavLink>
            <NavLink to="/super-admin/client-logs" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <FileText size={16} />
              Client Logs
            </NavLink>
          </>
        )}

        {/* Team Admin-only navigation */}
        {user?.role === 'team_admin' && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>Team Management</span>
            <NavLink to="/team-admin/tickets" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Ticket size={16} />
              Team Tickets
            </NavLink>
            <NavLink to="/team-admin/members" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Users size={16} />
              Team Members
            </NavLink>
            <NavLink to="/team-admin/performance" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <LayoutDashboard size={16} />
              Team Performance
            </NavLink>
          </>
        )}

        {/* Team User (Agent) navigation */}
        {user?.role === 'team_user' && (
          <>
            <span className="nav-section-label" style={{ marginTop: 8 }}>My Work</span>
            <NavLink to="/team-user/assigned-tickets" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Ticket size={16} />
              Assigned Tickets
            </NavLink>
            <NavLink to="/team-user/finished-tickets" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <CheckCircle size={16} />
              Finished Tickets
            </NavLink>
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
