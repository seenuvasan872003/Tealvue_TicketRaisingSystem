const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  // for store error in database
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
};

//register validation
const registerValidator = [
  body('name')
    .trim()
    .matches(/^[a-zA-Z\s\-]{2,50}$/)
    .withMessage('Name: 2–50 letters, spaces, or hyphens only'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .custom(value => {
      if (!/[A-Z]/.test(value)) {
        throw new Error('Password must contain at least one uppercase letter');
      }
      if (!/[0-9]/.test(value)) {
        throw new Error('Password must contain at least one number');
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(value)) {
        throw new Error('Password must contain at least one special character');
      }
      return true;
    }),
  runValidation
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Enter a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  runValidation
];

const createAdminValidator = [
  body('name')
    .trim()
    .matches(/^[a-zA-Z\s\-]{2,50}$/)
    .withMessage('Name: 2–50 letters, spaces, or hyphens only'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .custom(value => {
      if (!/[A-Z]/.test(value)) {
        throw new Error('Password must contain at least one uppercase letter');
      }
      if (!/[0-9]/.test(value)) {
        throw new Error('Password must contain at least one number');
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(value)) {
        throw new Error('Password must contain at least one special character');
      }
      return true;
    }),
  body('role')
    .optional()
    .isIn(['admin', 'super-admin'])
    .withMessage('Role must be admin or super-admin'),
  runValidation
];

const teamValidator = [
  body('name')
    .trim()
    .matches(/^[a-zA-Z0-9\s\-]{2,50}$/)
    .withMessage('Team Name: 2–50 letters, numbers, spaces, or hyphens only'),
  body('categories')
    .isArray({ min: 1 })
    .withMessage('At least one category is required')
    .custom((cats) => {
      // Allow any non-empty string categories (default + custom user-created)
      return cats.every(c => typeof c === 'string' && c.trim().length > 0 && c.trim().length <= 100);
    })
    .withMessage('Each category must be a non-empty string (max 100 characters)'),
  body('description')
    .optional({ checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('teamAdminName')
    .optional()
    .trim()
    .matches(/^[a-zA-Z\s\-]{2,50}$/)
    .withMessage('Admin Name: 2–50 letters, spaces, or hyphens only'),
  body('teamAdminEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address for Team Admin'),
  body('teamAdminPassword')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  runValidation
];

const ticketValidator = [
  body('title')
    .trim()
    .custom((val) => {
      if (/http|https|www/i.test(val)) {
        throw new Error('Title must be 5–100 characters, no links or special characters');
      }
      if (!/^[a-zA-Z0-9\s.,!?()'\-]{5,100}$/.test(val)) {
        throw new Error('Title must be 5–100 characters, no links or special characters');
      }
      return true;
    }),
  body('description')
    .trim()
    .customSanitizer((val) => {
      return sanitizeHtml(val, { allowedTags: [], allowedAttributes: {} });
    })
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be 20–2000 characters'),
  body('category')
    .optional({ checkFalsy: true })
    .trim()
    .custom((val) => {
      // Allow any non-empty string category including user-created ones
      // No whitelist restriction — teams can create custom categories
      if (val && (val.length < 1 || val.length > 100)) {
        throw new Error('Category must be between 1 and 100 characters');
      }
      return true;
    }),
  body('priority')
    .optional()
    .trim()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must match exact enum: low | medium | high'),
  body('due_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Must be a valid date')
    .custom((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        throw new Error('Due date cannot be in the past');
      }
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      if (date > oneYearFromNow) {
        throw new Error('Due date cannot be more than 1 year in the future');
      }
      return true;
    }),
  runValidation
];

module.exports = {
  registerValidator,
  loginValidator,
  createAdminValidator,
  teamValidator,
  ticketValidator
};
