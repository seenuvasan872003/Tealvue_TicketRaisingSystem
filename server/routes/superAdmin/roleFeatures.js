const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const {
  getAllUserFeatures,
  getUserFeatures,
  updateUserFeatures,
  updateRoleFeatures,
  unblockUser
} = require('../../controllers/roleFeatureController');

router.get('/role-features', ...guardRoute('roles_features'), getAllUserFeatures);
router.put('/role-features/role/:role', ...guardRoute('roles_features'), updateRoleFeatures);
router.get('/role-features/:userId', ...guardRoute('roles_features'), getUserFeatures);
router.put('/role-features/:userId', ...guardRoute('roles_features'), updateUserFeatures);
router.put('/role-features/unblock/:userId', ...guardRoute('roles_features'), unblockUser);

module.exports = router;
