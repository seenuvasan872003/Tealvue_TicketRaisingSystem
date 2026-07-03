const ROLE_PREFIX = {
  super_admin: '/api/super-admin',
  admin:       '/api/admin',
  team_admin:  '/api/team-admin',
  team_user:   '/api/team-user',
  user:        '/api/user'
};

const requireRolePrefix = (req, res, next) => {
  let role = req.user?.role;
  if (role === 'super-admin') {
    role = 'super_admin';
  }
  const allowed = ROLE_PREFIX[role];
  const actual  = req.originalUrl;

  if (!allowed) {
    return res.status(403).json({
      success: false,
      code:    'UNKNOWN_ROLE',
      message: 'Access denied. Unknown role.'
    });
  }

  if (!actual.startsWith(allowed)) {
    return res.status(403).json({
      success: false,
      code:    'WRONG_PREFIX',
      message: `Access denied. Role '${req.user?.role}' can only access '${allowed}' endpoints.`
    });
  }

  next();
};

module.exports = { requireRolePrefix };
