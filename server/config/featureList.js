// ============================================================
//  server/config/featureList.js  —  All Available Features
// ============================================================

const FEATURES = [
  {
    id:       'dashboard',
    label:    'Dashboard',
    section:  'MAIN',
    icon:     'ti-layout-dashboard',
    roles:    ['user', 'admin', 'super-admin', 'team_admin', 'team_user'],
    paths: {
      user: '/dashboard',
      admin: '/admin/dashboard',
      'super-admin': '/super-admin/dashboard',
      team_admin: '/team-admin/dashboard',
      team_user: '/team-user/dashboard'
    },
    apiPaths: {
      user: '/api/user/dashboard',
      admin: '/api/admin/dashboard',
      'super-admin': '/api/super-admin/dashboard',
      team_admin: '/api/team-admin/dashboard',
      team_user: '/api/team-user/dashboard'
    }
  },

  {
    id:       'super_admin_dashboard',
    label:    'Dashboard',
    section:  'MAIN',
    icon:     'ti-layout-dashboard',
    roles:    ['super-admin'],
    paths: {
      'super-admin': '/super-admin/dashboard'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/dashboard'
    }
  },

  {
    id:       'admin_dashboard',
    label:    'Dashboard',
    section:  'MAIN',
    icon:     'ti-layout-dashboard',
    roles:    ['admin'],
    paths: {
      admin: '/admin/dashboard'
    },
    apiPaths: {
      admin: '/api/admin/dashboard'
    }
  },

  {
    id:       'team_admin_dashboard',
    label:    'Dashboard',
    section:  'MAIN',
    icon:     'ti-layout-dashboard',
    roles:    ['team_admin'],
    paths: {
      team_admin: '/team-admin/dashboard'
    },
    apiPaths: {
      team_admin: '/api/team-admin/dashboard'
    }
  },

  {
    id:       'team_user_dashboard',
    label:    'Dashboard',
    section:  'MAIN',
    icon:     'ti-layout-dashboard',
    roles:    ['team_user'],
    paths: {
      team_user: '/team-user/dashboard'
    },
    apiPaths: {
      team_user: '/api/team-user/dashboard'
    }
  },

  {
    id:       'my_tickets',
    label:    'My Tickets',
    section:  'MY TICKETS',
    icon:     'ti-ticket',
    roles:    ['user', 'admin', 'super-admin', 'team_admin', 'team_user'],
    paths: {
      user: '/tickets/my',
      admin: '/admin/tickets/my',
      'super-admin': '/super-admin/tickets/my',
      team_admin: '/team-admin/tickets/my',
      team_user: '/team-user/tickets/my'
    },
    apiPaths: {
      user: '/api/user/tickets/my',
      admin: '/api/admin/tickets/my',
      'super-admin': '/api/super-admin/tickets/my',
      team_admin: '/api/team-admin/tickets/my',
      team_user: '/api/team-user/tickets/my'
    }
  },

  {
    id:       'create_ticket',
    label:    'Create Ticket',
    section:  'MY TICKETS',
    icon:     'ti-plus',
    roles:    ['user', 'admin', 'super-admin', 'team_admin', 'team_user'],
    paths: {
      user: '/tickets/create',
      admin: '/admin/tickets/create',
      'super-admin': '/super-admin/tickets/create',
      team_admin: '/team-admin/tickets/create',
      team_user: '/team-user/tickets/create'
    },
    apiPaths: {
      user: '/api/user/tickets',
      admin: '/api/admin/tickets',
      'super-admin': '/api/super-admin/tickets',
      team_admin: '/api/team-admin/tickets',
      team_user: '/api/team-user/tickets'
    }
  },

  {
    id:       'ticket_states',
    label:    'Show Ticket States',
    section:  'MY TICKETS',
    icon:     'ti-chart-pie',
    roles:    ['user', 'admin', 'super-admin', 'team_admin', 'team_user'],
    paths: {
      user: '/tickets/states',
      admin: '/admin/tickets/states',
      'super-admin': '/super-admin/tickets/states',
      team_admin: '/team-admin/tickets/states',
      team_user: '/team-user/tickets/states'
    },
    apiPaths: {
      user: '/api/user/tickets/states',
      admin: '/api/admin/tickets/states',
      'super-admin': '/api/super-admin/tickets/states',
      team_admin: '/api/team-admin/tickets/states',
      team_user: '/api/team-user/tickets/states'
    }
  },

  {
    id:       'ticket_approval',
    label:    'Ticket Approval',
    section:  'TICKET MANAGEMENT',
    icon:     'ti-clipboard-check',
    roles:    ['super-admin', 'admin', 'user', 'team_admin', 'team_user'],
    paths: {
      'super-admin': '/super-admin/tickets',
      admin: '/admin/tickets/approval',
      user: '/user/tickets/approval',
      team_admin: '/team-admin/tickets/approval',
      team_user: '/team-user/tickets/approval'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/tickets/approval',
      admin: '/api/admin/tickets/approval',
      user: '/api/user/tickets/approval',
      team_admin: '/api/team-admin/tickets/approval',
      team_user: '/api/team-user/tickets/approval'
    }
  },

  {
    id:       'all_tickets',
    label:    'All Tickets',
    section:  'TICKETS',
    icon:     'ti-ticket',
    roles:    ['admin', 'super-admin', 'user', 'team_admin', 'team_user'],
    paths: {
      admin:       '/admin/tickets',
      'super-admin': '/super-admin/all-tickets',
      user:        '/user/all-tickets',
      team_admin:  '/team-admin/all-tickets',
      team_user:   '/team-user/all-tickets'
    },
    apiPaths: {
      admin:       '/api/admin/tickets',
      'super-admin': '/api/super-admin/tickets',
      user:        '/api/user/tickets',
      team_admin:  '/api/team-admin/tickets',
      team_user:   '/api/team-user/tickets'
    }
  },

  {
    id:       'create_admin',
    label:    'Create Admin',
    section:  'MANAGEMENT',
    icon:     'ti-user-shield',
    roles:    ['super-admin', 'admin', 'user', 'team_admin', 'team_user'],
    paths: {
      'super-admin': '/super-admin/create-admin',
      admin:       '/admin/create-admin',
      user:        '/user/create-admin',
      team_admin:  '/team-admin/create-admin',
      team_user:   '/team-user/create-admin'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/create-admin',
      admin:       '/api/admin/create-admin',
      user:        '/api/user/create-admin',
      team_admin:  '/api/team-admin/create-admin',
      team_user:   '/api/team-user/create-admin'
    }
  },

  {
    id:       'create_user',
    label:    'Create User',
    section:  'MANAGEMENT',
    icon:     'ti-user-plus',
    roles:    ['super-admin', 'admin', 'team_admin', 'user', 'team_user'],
    paths: {
      'super-admin': '/super-admin/create-user',
      admin:       '/admin/create-user',
      team_admin:  '/team-admin/create-user',
      user:        '/user/create-user',
      team_user:   '/team-user/create-user'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/create-user',
      admin:       '/api/admin/create-user',
      team_admin:  '/api/team-admin/create-user',
      user:        '/api/user/create-user',
      team_user:   '/api/team-user/create-user'
    }
  },

  {
    id:       'all_users',
    label:    'All Users',
    section:  'MANAGEMENT',
    icon:     'ti-users',
    roles:    ['super-admin', 'admin', 'user', 'team_admin', 'team_user'],
    paths: {
      'super-admin': '/super-admin/users',
      admin:       '/admin/users',
      user:        '/user/users',
      team_admin:  '/team-admin/users',
      team_user:   '/team-user/users'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/users',
      admin:       '/api/admin/users',
      user:        '/api/user/users',
      team_admin:  '/api/team-admin/users',
      team_user:   '/api/team-user/users'
    }
  },

  {
    id:       'teams_management',
    label:    'Teams',
    section:  'MANAGEMENT',
    icon:     'ti-building',
    roles:    ['super-admin', 'admin', 'user', 'team_admin', 'team_user'],
    paths: {
      'super-admin': '/super-admin/teams',
      admin:       '/admin/teams',
      user:        '/user/teams',
      team_admin:  '/team-admin/teams',
      team_user:   '/team-user/teams'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/teams',
      admin:       '/api/admin/teams',
      user:        '/api/user/teams',
      team_admin:  '/api/team-admin/teams',
      team_user:   '/api/team-user/teams'
    }
  },

  {
    id:       'roles_features',
    label:    'Roles & Features',
    section:  'MANAGEMENT',
    icon:     'ti-shield-check',
    roles:    ['super-admin', 'admin', 'user', 'team_admin', 'team_user'],
    paths: {
      'super-admin': '/super-admin/roles',
      admin:       '/admin/roles',
      user:        '/user/roles',
      team_admin:  '/team-admin/roles',
      team_user:   '/team-user/roles'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/role-features',
      admin:       '/api/admin/role-features',
      user:        '/api/user/role-features',
      team_admin:  '/api/team-admin/role-features',
      team_user:   '/api/team-user/role-features'
    }
  },

  {
    id:       'team_dashboard',
    label:    'Team Dashboard',
    section:  'TEAMS',
    icon:     'ti-chart-bar',
    roles:    ['super-admin', 'admin', 'team_admin', 'user', 'team_user'],
    paths: {
      'super-admin': '/super-admin/team-dashboard',
      admin:       '/admin/team-dashboard',
      team_admin:  '/team-admin/team-dashboard',
      user:        '/user/team-dashboard',
      team_user:   '/team-user/team-dashboard'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/teams/dashboard',
      admin:       '/api/admin/teams/dashboard',
      team_admin:  '/api/team-admin/teams/dashboard',
      user:        '/api/user/teams/dashboard',
      team_user:   '/api/team-user/teams/dashboard'
    }
  },

  {
    id:       'team_tickets',
    label:    'Team Tickets',
    section:  'TEAM MANAGEMENT',
    icon:     'ti-ticket',
    roles:    ['team_admin', 'admin', 'super-admin', 'user', 'team_user'],
    paths: {
      team_admin: '/team-admin/tickets',
      admin:      '/admin/team-tickets',
      'super-admin': '/super-admin/team-tickets',
      user:        '/user/team-tickets',
      team_user:   '/team-user/team-tickets'
    },
    apiPaths: {
      team_admin: '/api/team-admin/tickets',
      admin:      '/api/admin/team-tickets',
      'super-admin': '/api/super-admin/team-tickets',
      user:        '/api/user/team-tickets',
      team_user:   '/api/team-user/team-tickets'
    }
  },

  {
    id:       'team_members',
    label:    'Team Members',
    section:  'TEAM MANAGEMENT',
    icon:     'ti-users',
    roles:    ['team_admin', 'admin', 'super-admin', 'user', 'team_user'],
    paths: {
      team_admin:  '/team-admin/members',
      admin:       '/admin/team-members',
      'super-admin': '/super-admin/team-members',
      user:        '/user/team-members',
      team_user:   '/team-user/team-members'
    },
    apiPaths: {
      team_admin:  '/api/team-admin/members',
      admin:       '/api/admin/team-members',
      'super-admin': '/api/super-admin/team-members',
      user:        '/api/user/team-members',
      team_user:   '/api/team-user/team-members'
    }
  },

  {
    id:       'team_performance',
    label:    'Team Performance',
    section:  'TEAM MANAGEMENT',
    icon:     'ti-chart-line',
    roles:    ['team_admin', 'admin', 'super-admin', 'user', 'team_user'],
    paths: {
      team_admin:  '/team-admin/performance',
      admin:       '/admin/team-performance',
      'super-admin': '/super-admin/team-performance',
      user:        '/user/team-performance',
      team_user:   '/team-user/team-performance'
    },
    apiPaths: {
      team_admin:  '/api/team-admin/performance',
      admin:       '/api/admin/team-performance',
      'super-admin': '/api/super-admin/team-performance',
      user:        '/api/user/team-performance',
      team_user:   '/api/team-user/team-performance'
    }
  },

  {
    id:       'assigned_tickets',
    label:    'Assigned Tickets',
    section:  'MY WORK',
    icon:     'ti-clipboard-list',
    roles:    ['team_user', 'team_admin', 'super-admin', 'admin', 'user'],
    paths: {
      team_user:  '/team-user/assigned-tickets',
      team_admin: '/team-admin/assigned-tickets',
      'super-admin': '/super-admin/assigned-tickets',
      admin:       '/admin/assigned-tickets',
      user:        '/user/assigned-tickets'
    },
    apiPaths: {
      team_user:  '/api/team-user/assigned-tickets',
      team_admin: '/api/team-admin/assigned-tickets',
      'super-admin': '/api/super-admin/assigned-tickets',
      admin:       '/api/admin/assigned-tickets',
      user:        '/api/user/assigned-tickets'
    }
  },

  {
    id:       'finished_tickets',
    label:    'Finished Tickets',
    section:  'MY WORK',
    icon:     'ti-circle-check',
    roles:    ['team_user', 'team_admin', 'super-admin', 'admin', 'user'],
    paths: {
      team_user:  '/team-user/finished-tickets',
      team_admin: '/team-admin/finished-tickets',
      'super-admin': '/super-admin/finished-tickets',
      admin:       '/admin/finished-tickets',
      user:        '/user/finished-tickets'
    },
    apiPaths: {
      team_user:  '/api/team-user/finished-tickets',
      team_admin: '/api/team-admin/finished-tickets',
      'super-admin': '/api/super-admin/finished-tickets',
      admin:       '/api/admin/finished-tickets',
      user:        '/api/user/finished-tickets'
    }
  },

  {
    id:       'ticket_lifecycle_logs',
    label:    'Ticket Lifecycle Logs',
    section:  'MONITORING',
    icon:     'ti-timeline',
    roles:    ['super-admin', 'admin', 'team_admin', 'team_user', 'user'],
    paths: {
      'super-admin': '/super-admin/ticket-logs',
      admin:       '/admin/ticket-logs',
      team_admin:  '/team-admin/ticket-logs',
      team_user:   '/team-user/ticket-logs',
      user:        '/user/ticket-logs'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/ticket-logs',
      admin:       '/api/admin/ticket-logs',
      team_admin:  '/api/team-admin/ticket-logs',
      team_user:   '/api/team-user/ticket-logs',
      user:        '/api/user/ticket-logs'
    }
  },

  {
    id:       'activity_logs',
    label:    'Activity Logs',
    section:  'MONITORING',
    icon:     'ti-activity',
    roles:    ['super-admin', 'admin', 'team_admin', 'team_user', 'user'],
    paths: {
      'super-admin': '/super-admin/activity-logs',
      admin:       '/admin/activity-logs',
      team_admin:  '/team-admin/activity-logs',
      team_user:   '/team-user/activity-logs',
      user:        '/user/activity-logs'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/activity-logs',
      admin:       '/api/admin/activity-logs',
      team_admin:  '/api/team-admin/activity-logs',
      team_user:   '/api/team-user/activity-logs',
      user:        '/api/user/activity-logs'
    }
  },

  {
    id:       'client_logs',
    label:    'Client Logs',
    section:  'MONITORING',
    icon:     'ti-terminal',
    roles:    ['super-admin', 'admin', 'user', 'team_admin', 'team_user'],
    paths: {
      'super-admin': '/super-admin/client-logs',
      admin:       '/admin/client-logs',
      user:        '/user/client-logs',
      team_admin:  '/team-admin/client-logs',
      team_user:   '/team-user/client-logs'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/client-logs',
      admin:       '/api/admin/client-logs',
      user:        '/api/user/client-logs',
      team_admin:  '/api/team-admin/client-logs',
      team_user:   '/api/team-user/client-logs'
    }
  },

  {
    id:       'user_activity_logs',
    label:    'User Activity',
    section:  'MONITORING',
    icon:     'ti-user-check',
    roles:    ['super-admin', 'admin', 'team_admin'],
    paths: {
      'super-admin': '/super-admin/user-activity',
      admin:       '/admin/user-activity'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/user-activity',
      admin:       '/api/admin/user-activity',
      team_admin:  '/api/team-admin/user-activity'
    }
  },

  {
    id:       'feedback_report',
    label:    'Feedback Report',
    section:  'MONITORING',
    icon:     'ti-star',
    roles:    ['super-admin', 'admin', 'team_admin'],
    paths: {
      'super-admin': '/super-admin/performance',
      admin:       '/admin/performance',
      team_admin:  '/team-admin/performance'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/feedback',
      admin:       '/api/admin/feedback',
      team_admin:  '/api/team-admin/feedback'
    }
  },

  {
    id:       'export_data',
    label:    'Export Data',
    section:  'MONITORING',
    icon:     'ti-download',
    roles:    ['super-admin', 'admin'],
    paths: {
      'super-admin': '/super-admin/export',
      admin:       '/admin/export'
    },
    apiPaths: {
      'super-admin': '/api/super-admin/export',
      admin:       '/api/admin/export'
    }
  }
];

module.exports = FEATURES;

