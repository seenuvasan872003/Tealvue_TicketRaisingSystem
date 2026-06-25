// ============================================================
//  server/routes/auth.js  —  Authentication Routes
// ============================================================
//  POST /api/auth/register  → register
//  POST /api/auth/login     → login
//  GET  /api/auth/profile   → getProfile   [JWT required]
//  PUT  /api/auth/profile   → updateProfile [JWT required]
//    └── multipart/form-data for avatar upload (optional field 'avatar')
// ============================================================

const express = require('express');
const router  = express.Router();

const { register, login, getProfile, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { upload }  = require('../config/multer');
const { registerValidator, loginValidator } = require('../middleware/validationMiddleware');

router.post('/register', registerValidator, register);
router.post('/login',    loginValidator, login);
router.get('/profile',   protect, getProfile);

// Avatar is a single optional file under field name 'avatar'
router.put('/profile',   protect, upload.single('avatar'), updateProfile);

module.exports = router;
