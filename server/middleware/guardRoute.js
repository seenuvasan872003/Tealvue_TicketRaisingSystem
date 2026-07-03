const { protect }              = require('./protect');
const { requireRolePrefix }    = require('./requireRolePrefix');
const { requireFeature }       = require('./requireFeature');
const { requirePathOwnership } = require('./requirePathOwnership');

const guardRoute = (featureId) => [
  protect,     // Gate 1: Check JWT token is valid
  requireRolePrefix,  // Gate 2: Check Prefix belongs to Role
  requireFeature(featureId),    // Gate 3: Check User is assigned the Feature
  requirePathOwnership(featureId)  // Gate 4: Check Request Path belongs to Feature
];

module.exports = { guardRoute };
