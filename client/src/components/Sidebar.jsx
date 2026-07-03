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
import { getVisibleFeatures } from '../config/featureHelpers';
import tealvueLogo from '../assets/tealvue1.png';
import API from '../services/authApi';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ICON_MAP = {
  'ti-layout-dashboard': LayoutDashboard,
  'ti-ticket': Ticket,
  'ti-plus': Plus,
  'ti-chart-pie': Clock,
  'ti-clipboard-check': Ticket,
  'ti-user-shield': UserPlus,
  'ti-user-plus': UserPlus,
  'ti-users': Users,
  'ti-building': ShieldCheck,
  'ti-shield-check': Layers,
  'ti-chart-bar': LayoutDashboard,
  'ti-chart-line': LayoutDashboard,
  'ti-clipboard-list': Ticket,
  'ti-circle-check': CheckCircle,
  'ti-timeline': FileText,
  'ti-activity': FileText,
  'ti-terminal': FileText
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, features } = useAuth();
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

  const visibleItems = getVisibleFeatures(features || [], user?.role || '');

  const grouped = visibleItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push({
      ...item,
      resolvedPath: item.paths[user.role]
    });
    return acc;
  }, {});

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
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section} style={{ display: 'contents' }}>
            <span className="nav-section-label" style={{ marginTop: 8 }}>{section}</span>
            {items.map(item => {
              const IconComp = ICON_MAP[item.icon] || Ticket;
              return (
                <NavLink 
                  key={item.id} 
                  to={item.resolvedPath} 
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <IconComp size={16} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        ))}
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
