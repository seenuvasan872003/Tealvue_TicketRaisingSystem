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

router.get('/features', ...guardRoute('features_management'), getAllUserFeatures);
router.get('/features/preview-count', ...guardRoute('features_management'), getPreviewCount);
router.put('/features/assign-to-roles', ...guardRoute('features_management'), assignFeatureToRoles);
router.put('/features/remove-from-roles', ...guardRoute('features_management'), removeFeatureFromRoles);
router.put('/features/reset-role', ...guardRoute('features_management'), resetRoleFeatures);

router.put('/features/role/:role', ...guardRoute('features_management'), updateRoleFeatures);
router.get('/features/:userId', ...guardRoute('features_management'), getUserFeatures);
router.put('/features/:userId', ...guardRoute('features_management'), updateUserFeatures);
router.put('/features/unblock/:userId', ...guardRoute('features_management'), unblockUser);

module.exports = router;
