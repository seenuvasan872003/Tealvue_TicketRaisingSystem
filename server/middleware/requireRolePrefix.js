// Check Prefix belongs to Role
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

  // Check if role is allowed
  if (!allowed) {
    return res.status(403).json({
      success: false,
      code:    'UNKNOWN_ROLE',
      message: 'Access denied. Unknown role.'
    });
  }

  // Check if URL starts with the allowed prefix
  if (!actual.startsWith(allowed)) {
    return res.status(403).json({
      success: false,
      code:    'WRONG_PREFIX',
      message: `Access denied. Role '${req.user?.role}' can only access '${allowed}' endpoints.`
    });
  }

  // Move to the next middleware or route handler
  next();
};

module.exports = { requireRolePrefix };
