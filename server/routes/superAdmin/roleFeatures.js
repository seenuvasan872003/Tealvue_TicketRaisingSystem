const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const {
  getAllUserFeatures,
  getUserFeatures,
  updateUserFeatures,
  updateRoleFeatures,
  unblockUser,
  getPreviewCount,
  assignFeatureToRoles,
  removeFeatureFromRoles,
  resetRoleFeatures,
} = require('../../controllers/roleFeatureController');

router.get('/role-features', ...guardRoute('roles_features'), getAllUserFeatures);
router.get('/role-features/preview-count', ...guardRoute('roles_features'), getPreviewCount);
router.put('/role-features/assign-to-roles', ...guardRoute('roles_features'), assignFeatureToRoles);
router.put('/role-features/remove-from-roles', ...guardRoute('roles_features'), removeFeatureFromRoles);
router.put('/role-features/reset-role', ...guardRoute('roles_features'), resetRoleFeatures);

router.put('/role-features/role/:role', ...guardRoute('roles_features'), updateRoleFeatures);
router.get('/role-features/:userId', ...guardRoute('roles_features'), getUserFeatures);
router.put('/role-features/:userId', ...guardRoute('roles_features'), updateUserFeatures);
router.put('/role-features/unblock/:userId', ...guardRoute('roles_features'), unblockUser);

module.exports = router;
