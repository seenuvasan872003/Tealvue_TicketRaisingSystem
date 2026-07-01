// ============================================================
//  server/config/multer.js  —  File Upload Configuration
// ============================================================
//  STORAGE: Disk — server/uploads/ directory
//  LIMITS:
//    Single file max: MAX_FILE_SIZE_MB (env, default 5MB)
//    Files per ticket: MAX_FILES_PER_TICKET (env, default 30)
//  ACCEPTED TYPES:
//    Images: jpeg, jpg, png, gif, webp
//    Documents: pdf, doc, docx, xls, xlsx, txt
//
//  USAGE:
//    const { uploadTicketFiles } = require('../config/multer');
//    router.post('/tickets', protect, uploadTicketFiles, createTicket);
// ============================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const extensionToMime = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
};

// ── Storage configuration ────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext);
    // Remove special chars, replace spaces/underscores with single underscore
    const sanitizedBase = baseName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedBase}${ext}`);
  },
});

// ── File type filter ──────────────────────────────────────
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('File type not allowed. Only JPG, PNG, WEBP, PDF accepted.'), false);
  }
  
  // Extension spoofing check
  const ext = path.extname(file.originalname).toLowerCase();
  const expectedMime = extensionToMime[ext];
  if (!expectedMime || expectedMime !== file.mimetype) {
    return cb(new Error('Spoofed extension detected. File extension does not match file type.'), false);
  }
  
  cb(null, true);
};

// ── Limits ────────────────────────────────────────────────
const MAX_SIZE_MB = 5;
const MAX_FILES = 3;

// ── Multer instance ───────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
  },
});

// Named export — used in ticket routes
const uploadTicketFiles = (req, res, next) => {
  const uploadArray = upload.array('attachments', MAX_FILES);
  uploadArray(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

module.exports = { upload, uploadTicketFiles };
