const ROLE_DEFAULTS = {
  'super-admin': [
    'dashboard', 'ticket_approval', 'all_users', 'teams_management', 
    'features_management', 'role_management', 'manage_categories',
    'team_dashboard', 'ticket_lifecycle_logs', 'activity_logs', 'client_logs'
  ],
  'admin': [
    'dashboard', 'all_tickets', 'all_users',
    'team_dashboard', 'ticket_lifecycle_logs', 'activity_logs',
    'user_activity_logs',
  ],
  'user': [
    'dashboard', 'my_tickets', 'create_ticket', 'ticket_states'
  ],
  'team_admin': [
    'dashboard', 'team_tickets', 'team_members', 'team_performance',
    'user_activity_logs'
  ],
  'team_user': [
    'dashboard', 'assigned_tickets', 'finished_tickets'
  ]
};

module.exports = ROLE_DEFAULTS;

