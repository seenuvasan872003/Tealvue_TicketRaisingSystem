const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { createAdminAccount } = require('../../controllers/userController');
const { protect } = require('../../middleware/authMiddleware');
const { requireSuperAdmin, requireFeature } = require('../../middleware/roleMiddleware');
const { createAdminValidator } = require('../../middleware/validationMiddleware');

router.post('/create-admin', ...guardRoute('create_admin'), createAdminValidator, createAdminAccount);

module.exports = router;
