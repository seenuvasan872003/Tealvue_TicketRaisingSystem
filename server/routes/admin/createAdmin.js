const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { createAdminAccount } = require('../../controllers/userController');
const { protect } = require('../../middleware/authMiddleware');
const { requireAdmin, requireFeature } = require('../../middleware/roleMiddleware');
const { createAdminValidator } = require('../../middleware/validationMiddleware');

router.post('/create-admin', ...guardRoute('create_admin'), createAdminValidator, (req, res, next) => {
  if (req.body.role === 'super-admin') {
    return res.status(403).json({ message: 'Admins cannot create super-admin accounts' });
  }
  next();
}, createAdminAccount);

module.exports = router;
