import { lazy } from 'react';

const PAGE_MAP = {


  all_users: {
    'super-admin': lazy(() => import('../pages/UserManagement')),
    admin:       lazy(() => import('../pages/UserManagement')),
    user:        lazy(() => import('../pages/UserManagement')),
    team_admin:  lazy(() => import('../pages/UserManagement')),
    team_user:   lazy(() => import('../pages/UserManagement'))
  },

  all_tickets: {
    'super-admin': lazy(() => import('../pages/AllTickets')),
    admin:       lazy(() => import('../pages/AllTickets')),
    user:        lazy(() => import('../pages/AllTickets')),
    team_admin:  lazy(() => import('../pages/AllTickets')),
    team_user:   lazy(() => import('../pages/AllTickets'))
  },

  teams_management: {
    'super-admin': lazy(() => import('../pages/Teams')),
    admin:       lazy(() => import('../pages/Teams')),
    user:        lazy(() => import('../pages/Teams')),
    team_admin:  lazy(() => import('../pages/Teams')),
    team_user:   lazy(() => import('../pages/Teams'))
  },

  team_dashboard: {
    'super-admin': lazy(() => import('../pages/TeamDashboard')),
    admin:       lazy(() => import('../pages/TeamDashboard')),
    team_admin:  lazy(() => import('../pages/TeamDashboard')),
    user:        lazy(() => import('../pages/TeamDashboard')),
    team_user:   lazy(() => import('../pages/TeamDashboard'))
  },

  team_tickets: {
    team_admin: lazy(() => import('../pages/TeamTickets')),
    admin:      lazy(() => import('../pages/TeamTickets')),
    'super-admin': lazy(() => import('../pages/TeamTickets')),
    user:        lazy(() => import('../pages/TeamTickets')),
    team_user:   lazy(() => import('../pages/TeamTickets'))
  },

  team_members: {
    team_admin:  lazy(() => import('../pages/TeamMembers')),
    admin:       lazy(() => import('../pages/TeamMembers')),
    'super-admin': lazy(() => import('../pages/TeamMembers')),
    user:        lazy(() => import('../pages/TeamMembers')),
    team_user:   lazy(() => import('../pages/TeamMembers'))
  },

  team_performance: {
    team_admin:  lazy(() => import('../pages/TeamPerformance')),
    admin:       lazy(() => import('../pages/TeamPerformance')),
    'super-admin': lazy(() => import('../pages/TeamPerformance')),
    user:        lazy(() => import('../pages/TeamPerformance')),
    team_user:   lazy(() => import('../pages/TeamPerformance'))
  },

  ticket_lifecycle_logs: {
    'super-admin': lazy(() => import('../pages/TicketLogs')),
    admin:       lazy(() => import('../pages/TicketLogs')),
    team_admin:  lazy(() => import('../pages/TicketLogs')),
    team_user:   lazy(() => import('../pages/TicketLogs')),
    user:        lazy(() => import('../pages/TicketLogs'))
  },

  activity_logs: {
    'super-admin': lazy(() => import('../pages/Logs')),
    admin:       lazy(() => import('../pages/Logs')),
    team_admin:  lazy(() => import('../pages/Logs')),
    team_user:   lazy(() => import('../pages/Logs')),
    user:        lazy(() => import('../pages/Logs'))
  },

  assigned_tickets: {
    team_user:  lazy(() => import('../pages/TeamUserTickets')),
    team_admin: lazy(() => import('../pages/TeamUserTickets')),
    'super-admin': lazy(() => import('../pages/TeamUserTickets')),
    admin:       lazy(() => import('../pages/TeamUserTickets')),
    user:        lazy(() => import('../pages/TeamUserTickets'))
  },

  finished_tickets: {
    team_user:  lazy(() => import('../pages/TeamUserTickets')),
    team_admin: lazy(() => import('../pages/TeamUserTickets')),
    'super-admin': lazy(() => import('../pages/TeamUserTickets')),
    admin:       lazy(() => import('../pages/TeamUserTickets')),
    user:        lazy(() => import('../pages/TeamUserTickets'))
  },

  dashboard: {
    user:        lazy(() => import('../pages/Dashboard')),
    admin:       lazy(() => import('../pages/Dashboard')),
    'super-admin': lazy(() => import('../pages/Dashboard')),
    team_admin:  lazy(() => import('../pages/Dashboard')),
    team_user:   lazy(() => import('../pages/Dashboard'))
  },
  super_admin_dashboard: { 'super-admin': lazy(() => import('../pages/Dashboard')) },
  admin_dashboard:       { admin:       lazy(() => import('../pages/Dashboard')) },
  team_admin_dashboard:  { team_admin:  lazy(() => import('../pages/Dashboard')) },
  team_user_dashboard:   { team_user:   lazy(() => import('../pages/Dashboard')) },
  my_tickets:            { 
    user:        lazy(() => import('../pages/MyTickets')),
    admin:       lazy(() => import('../pages/MyTickets')),
    'super-admin': lazy(() => import('../pages/MyTickets')),
    team_admin:  lazy(() => import('../pages/MyTickets')),
    team_user:   lazy(() => import('../pages/MyTickets'))
  },
  create_ticket:         { 
    user:        lazy(() => import('../pages/CreateTicket')),
    admin:       lazy(() => import('../pages/CreateTicket')),
    'super-admin': lazy(() => import('../pages/CreateTicket')),
    team_admin:  lazy(() => import('../pages/CreateTicket')),
    team_user:   lazy(() => import('../pages/CreateTicket'))
  },
  ticket_states:         { 
    user:        lazy(() => import('../pages/UserTicketStates')),
    admin:       lazy(() => import('../pages/UserTicketStates')),
    'super-admin': lazy(() => import('../pages/UserTicketStates')),
    team_admin:  lazy(() => import('../pages/UserTicketStates')),
    team_user:   lazy(() => import('../pages/UserTicketStates'))
  },
  ticket_approval: { 
    'super-admin': lazy(() => import('../pages/TicketApproval')),
    admin:       lazy(() => import('../pages/TicketApproval')),
    user:        lazy(() => import('../pages/TicketApproval')),
    team_admin:  lazy(() => import('../pages/TicketApproval')),
    team_user:   lazy(() => import('../pages/TicketApproval'))
  },
  features_management: { 
    'super-admin': lazy(() => import('../pages/FeaturesManagement')),
    admin:       lazy(() => import('../pages/FeaturesManagement')),
    user:        lazy(() => import('../pages/FeaturesManagement')),
    team_admin:  lazy(() => import('../pages/FeaturesManagement')),
    team_user:   lazy(() => import('../pages/FeaturesManagement'))
  },
  role_management: {
    'super-admin': lazy(() => import('../pages/RoleManagement'))
  },
  client_logs: { 
    'super-admin': lazy(() => import('../pages/ClientLogs')),
    admin:       lazy(() => import('../pages/ClientLogs')),
    user:        lazy(() => import('../pages/ClientLogs')),
    team_admin:  lazy(() => import('../pages/ClientLogs')),
    team_user:   lazy(() => import('../pages/ClientLogs'))
  },
  manage_categories: {
    'super-admin': lazy(() => import('../pages/Categories')),
    admin:       lazy(() => import('../pages/Categories')),
    team_admin:  lazy(() => import('../pages/Categories')),
    user:        lazy(() => import('../pages/Categories')),
    team_user:   lazy(() => import('../pages/Categories'))
  },
  user_activity_logs: {
    'super-admin': lazy(() => import('../pages/UserActivityDashboard')),
    admin:         lazy(() => import('../pages/UserActivityDashboard'))
  }
};

export default PAGE_MAP;
