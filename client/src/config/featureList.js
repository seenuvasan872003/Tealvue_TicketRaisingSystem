// ============================================================
//  client/src/config/featureList.js  —  All Available Features
// ============================================================
//  Each feature has:
//    id       — used as the feature key in the DB and sidebar checks
//    label    — shown in the Roles & Features page UI
//    category — groups features together in the checklist
//    roles    — which roles this feature is relevant to
// ============================================================

export const FEATURES = [
  // ── Dashboard ──────────────────────────────────────────────
  { id: 'dashboard',            label: 'Dashboard',               category: 'Main',              roles: ['super-admin','admin','user','team_admin','team_user'] },

  // ── Super Admin ────────────────────────────────────────────
  { id: 'ticket_approval',      label: 'Ticket Approval',         category: 'Ticket Management', roles: ['super-admin'] },
  { id: 'create_user',          label: 'Create User',             category: 'Management',        roles: ['super-admin'] },
  { id: 'create_admin',         label: 'Create Admin',            category: 'Management',        roles: ['super-admin'] },
  { id: 'teams_management',     label: 'Teams',                   category: 'Management',        roles: ['super-admin'] },
  { id: 'roles_features',       label: 'Roles & Features',        category: 'Management',        roles: ['super-admin'] },
  { id: 'client_logs',          label: 'Client Logs',             category: 'Monitoring',        roles: ['super-admin'] },

  // ── Admin ──────────────────────────────────────────────────
  { id: 'all_tickets',          label: 'All Tickets',             category: 'Tickets',           roles: ['admin','super-admin'] },
  { id: 'all_users',            label: 'All Users',               category: 'Management',        roles: ['admin','super-admin'] },
  { id: 'team_dashboard',       label: 'Team Dashboard',          category: 'Teams',             roles: ['admin','super-admin'] },
  { id: 'ticket_lifecycle_logs',label: 'Ticket Lifecycle Logs',   category: 'Monitoring',        roles: ['admin','super-admin'] },
  { id: 'activity_logs',        label: 'Activity Logs',           category: 'Monitoring',        roles: ['admin','super-admin'] },

  // ── User ───────────────────────────────────────────────────
  { id: 'my_tickets',           label: 'My Tickets',              category: 'Tickets',           roles: ['user'] },
  { id: 'create_ticket',        label: 'Create Ticket',           category: 'Tickets',           roles: ['user'] },
  { id: 'ticket_states',        label: 'Ticket Status Tracker',   category: 'Tickets',           roles: ['user'] },

  // ── Team Admin ─────────────────────────────────────────────
  { id: 'team_tickets',         label: 'Team Tickets',            category: 'Team Management',   roles: ['team_admin'] },
  { id: 'team_members',         label: 'Team Members',            category: 'Team Management',   roles: ['team_admin'] },
  { id: 'team_performance',     label: 'Team Performance',        category: 'Team Management',   roles: ['team_admin'] },

  // ── Team User ──────────────────────────────────────────────
  { id: 'assigned_tickets',     label: 'Assigned Tickets',        category: 'My Work',           roles: ['team_user'] },
  { id: 'finished_tickets',     label: 'Finished Tickets',        category: 'My Work',           roles: ['team_user'] },
];

// Get all unique categories
export const getCategories = () => [...new Set(FEATURES.map(f => f.category))];

// Get features applicable to a specific role
export const getFeaturesForRole = (role) =>
  FEATURES.filter(f => f.roles.includes(role));
