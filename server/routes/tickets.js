// ============================================================
//  server/routes/tickets.js  —  Ticket Routes
// ============================================================
//  Includes Phase 1 + Phase 2 chart endpoints
// ============================================================

const express = require('express');
const router  = express.Router();

const {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  addInternalNote,
  deleteTicket,
  getStats,
  getMyStats,
  getGrowthData,
  getStatusBreakdown,
  getAdminWorkload,
  assignTeam,
  updateStatus,
  updatePriority,
  updateDueDate,
  assignMember,
  closeTicket,
  getAllTicketsAdmin,
  suspendTicket,
  rejectTicket,
  restoreTicket,
  bulkModerateTickets,
  getTicketLogs,
  getTicketTimeSummary,
  getAllTicketLogs,
  setCategory,
  declineTicket,
  reallocateTicket,
  transferToAdmin,
} = require('../controllers/ticketController');

const { protect }             = require('../middleware/authMiddleware');
const { requireAdmin, requireSuperAdmin, requireAdminOrSuperAdmin } = require('../middleware/roleMiddleware');
const { uploadTicketFiles }   = require('../config/multer');

const { ticketValidator } = require('../middleware/validationMiddleware');

// ── Named stat/chart routes — MUST come before /:id ──────
router.get('/stats',     protect, requireAdmin,      getStats);
router.get('/my-stats',  protect,                    getMyStats);
router.get('/growth',    protect, requireAdmin,      getGrowthData);
router.get('/breakdown', protect, requireAdmin,      getStatusBreakdown);
router.get('/workload',  protect, requireAdmin, getAdminWorkload);
router.get('/logs/all',  protect, requireAdmin, getAllTicketLogs);

// ── Content Moderation routes ─────────────────────────────
router.get('/all', protect, requireSuperAdmin, getAllTicketsAdmin);
router.put('/bulk-moderate', protect, requireSuperAdmin, bulkModerateTickets);
router.put('/:id/suspend', protect, requireSuperAdmin, suspendTicket);
router.put('/:id/reject', protect, requireSuperAdmin, rejectTicket);
router.put('/:id/restore', protect, requireAdminOrSuperAdmin, restoreTicket);

// ── CRUD ──────────────────────────────────────────────────
router.get('/',    protect, getTickets);
router.post('/',   protect, uploadTicketFiles, ticketValidator, createTicket);   // multer handles file upload
router.get('/:id', protect, getTicketById);
router.get('/:id/logs', protect, getTicketLogs);
router.get('/:id/time-summary', protect, getTicketTimeSummary);
router.put('/:id', protect, ticketValidator, updateTicket);
router.put('/:id/status', protect, requireAdmin, updateStatus);
router.put('/:id/priority', protect, requireAdmin, updatePriority);
router.put('/:id/due-date', protect, requireAdmin, updateDueDate);
router.put('/:id/assign-team', protect, requireAdmin, assignTeam);
router.put('/:id/assign-member', protect, assignMember);
router.put('/:id/close', protect, closeTicket);

// ── New Allocation Routes ───────────────────────────────
router.put('/:id/set-category', protect, requireAdmin, setCategory);
router.put('/:id/decline', protect, requireAdmin, declineTicket);
router.put('/:id/reallocate', protect, reallocateTicket);
router.put('/:id/transfer-to-admin', protect, transferToAdmin);

router.delete('/:id', protect, deleteTicket);

// ── Internal Notes ────────────────────────────────────────
router.post('/:id/notes', protect, requireAdmin, addInternalNote);

module.exports = router;
