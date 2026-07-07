const ROLE_DEFAULTS = {
  'super-admin': [
    'dashboard', 'ticket_approval', 'all_users', 'create_user',
    'create_admin', 'teams_management', 'roles_features',
    'team_dashboard', 'ticket_lifecycle_logs', 'activity_logs', 'client_logs',
    'user_activity_logs', 'feedback_report', 'export_data'
  ],
  'admin': [
    'dashboard', 'all_tickets', 'all_users',
    'team_dashboard', 'ticket_lifecycle_logs', 'activity_logs',
    'user_activity_logs', 'feedback_report', 'export_data',
  ],
  'user': [
    'dashboard', 'my_tickets', 'create_ticket', 'ticket_states'
  ],
  'team_admin': [
    'dashboard', 'team_tickets', 'team_members', 'team_performance',
    'user_activity_logs', 'feedback_report'
  ],
  'team_user': [
    'dashboard', 'assigned_tickets', 'finished_tickets'
  ]
};

module.exports = ROLE_DEFAULTS;

