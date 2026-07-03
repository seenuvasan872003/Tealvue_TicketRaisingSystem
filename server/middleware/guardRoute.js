const { protect }              = require('./protect');
const { requireRolePrefix }    = require('./requireRolePrefix');
const { requireFeature }       = require('./requireFeature');
const { requirePathOwnership } = require('./requirePathOwnership');

const guardRoute = (featureId) => [
  protect,
  requireRolePrefix,
  requireFeature(featureId),
  requirePathOwnership(featureId)
];

module.exports = { guardRoute };
