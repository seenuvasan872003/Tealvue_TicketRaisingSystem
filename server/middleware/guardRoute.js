const { protect }              = require('./protect');
const { requireRolePrefix }    = require('./requireRolePrefix');
const { requireFeature }       = require('./requireFeature');
const { requirePathOwnership } = require('./requirePathOwnership');

const guardRoute = (featureId) => [
  protect,     //  1: Check JWT token is valid
  requireRolePrefix,  // 2: Check Prefix belongs to Role
  requireFeature(featureId),    // 3: Check User is assigned the Feature
  requirePathOwnership(featureId)  // 4: Check Request Path belongs to Feature
];

module.exports = { guardRoute };

