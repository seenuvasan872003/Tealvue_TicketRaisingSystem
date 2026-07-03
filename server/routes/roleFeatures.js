// ============================================================
//  server/routes/roleFeatures.js  —  Role Feature Routes
// ============================================================
//  GET  /api/role-features/me              → getMyFeatures       [all]
//  GET  /api/role-features                 → getAllUserFeatures   [super-admin]
//  GET  /api/role-features/:userId         → getUserFeatures      [super-admin]
//  PUT  /api/role-features/:userId         → updateUserFeatures   [super-admin]
//  PUT  /api/role-features/role/:role      → updateRoleFeatures   [super-admin]
// ============================================================

const express = require('express');
const router  = express.Router();

const {
  getMyFeatures,
  getAllUserFeatures,
  getUserFeatures,
  updateUserFeatures,
  updateRoleFeatures,
  unblockUser,
  logViolation,
} = require('../controllers/roleFeatureController');

const { protect }         = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/roleMiddleware');

// Current user's own features — must be before /:userId
router.get('/me',              protect,                    getMyFeatures);

// Bulk role update — must be before /:userId
router.put('/role/:role',      protect, requireSuperAdmin, updateRoleFeatures);

// All users features list (super-admin only)
router.get('/',                protect, requireSuperAdmin, getAllUserFeatures);

// Log frontend route violation (all users)
router.post('/violation',      protect,                    logViolation);

// Single user features
router.get('/:userId',         protect, requireSuperAdmin, getUserFeatures);
router.put('/:userId',         protect, requireSuperAdmin, updateUserFeatures);
router.put('/unblock/:userId',  protect, requireSuperAdmin, unblockUser);

module.exports = router;
