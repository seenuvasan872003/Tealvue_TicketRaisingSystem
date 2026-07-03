// ============================================================
//  server/routes/users.js  —  User Management Routes
// ============================================================
//  GET    /api/users             → getAllUsers       [Admin+, feature: all_users]
//  GET    /api/users/stats       → getUserStats      [Admin+, feature: all_users]
//  GET    /api/users/:id         → getUserById       [Admin+ or self]
//  POST   /api/users/create-admin→ createAdminAccount[Super Admin, feature: create_admin]
//  POST   /api/users/create-user → createUserAccount [Super Admin, feature: create_user]
//  PUT    /api/users/:id/status  → updateUserStatus  [Admin+]
//  DELETE /api/users/:id         → deleteUser        [Admin+, scoped]
//  Layer 3 feature guards: requireFeature('feature_id')
// ============================================================

const express = require('express');
const router  = express.Router();

const {
  getAllUsers,
  getUserStats,
  getUserById,
  createAdminAccount,
  updateUserStatus,
  deleteUser,
  createUserAccount,
  getUserActivity,
} = require('../controllers/userController');

const { updateProfile } = require('../controllers/authController');

const { protect, canEditProfile } = require('../middleware/authMiddleware');
const { requireAdmin, requireSuperAdmin, requireFeature } = require('../middleware/roleMiddleware');

const { createAdminValidator } = require('../middleware/validationMiddleware');

// ── Stats — must be before /:id ───────────────────────────
router.get('/stats',        protect, requireFeature('all_users'),    getUserStats);

// ── Create admin / user account ───────────────────────────
router.post('/create-admin', protect, requireFeature('create_admin'), createAdminValidator, createAdminAccount);
router.post('/create-user',  protect, requireFeature('create_user'),  createAdminValidator, createUserAccount);

// ── List all users ────────────────────────────────────────
router.get('/',              protect, requireFeature('all_users'),    getAllUsers);

// ── Single user ───────────────────────────────────────────
router.get('/:id',           protect,                    getUserById);
router.get('/:id/activity',  protect, requireAdmin,      getUserActivity);
router.put('/:id',           protect, canEditProfile,    updateProfile);

// ── Status update (approve / suspend / role change) ───────
router.put('/:id/status',    protect, requireAdmin,      updateUserStatus);

// ── Delete ────────────────────────────────────────────────
router.delete('/:id',        protect, requireAdmin,      deleteUser);

module.exports = router;

