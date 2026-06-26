// ============================================================
//  server/routes/users.js  —  User Management Routes
// ============================================================
//  GET    /api/users             → getAllUsers       [Admin+]
//  GET    /api/users/stats       → getUserStats      [Admin+]
//  GET    /api/users/:id         → getUserById       [Admin+ or self]
//  POST   /api/users/create-admin→ createAdminAccount[Super Admin]
//  PUT    /api/users/:id/status  → updateUserStatus  [Super Admin]
//  DELETE /api/users/:id         → deleteUser        [Admin+, scoped]
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
const { requireAdmin, requireSuperAdmin } = require('../middleware/roleMiddleware');

const { createAdminValidator } = require('../middleware/validationMiddleware');

// ── Stats — must be before /:id ───────────────────────────
router.get('/stats',        protect, requireAdmin,      getUserStats);

// ── Create admin / user account ───────────────────────────
router.post('/create-admin', protect, requireSuperAdmin, createAdminValidator, createAdminAccount);
router.post('/create-user',  protect, requireSuperAdmin, createAdminValidator, createUserAccount);

// ── List all users ────────────────────────────────────────
router.get('/',              protect, requireAdmin,      getAllUsers);

// ── Single user ───────────────────────────────────────────
router.get('/:id',           protect,                    getUserById);
router.get('/:id/activity',  protect, requireAdmin,      getUserActivity);
router.put('/:id',           protect, canEditProfile,    updateProfile);

// ── Status update (approve / suspend / role change) ───────
router.put('/:id/status',    protect, requireAdmin,      updateUserStatus);

// ── Delete ────────────────────────────────────────────────
router.delete('/:id',        protect, requireAdmin,      deleteUser);

module.exports = router;
