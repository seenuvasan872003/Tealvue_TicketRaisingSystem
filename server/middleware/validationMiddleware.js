const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
};

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
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
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
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
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
      const valid = ['General', 'Technical', 'Billing', 'HR', 'Other'];
      return cats.every(c => valid.includes(c));
    })
    .withMessage('Invalid category selected'),
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
      const stripped = sanitizeHtml(val, { allowedTags: [], allowedAttributes: {} });
      if (stripped !== val) {
        throw new Error('Title must be 5–100 characters, no links or special characters');
      }
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
    .isIn(['General', 'Technical', 'Billing', 'HR', 'Other'])
    .withMessage('Category must match exact enum: General | Technical | Billing | HR | Other'),
  body('priority')
    .optional()
    .trim()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must match exact enum: low | medium | high | urgent'),
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
