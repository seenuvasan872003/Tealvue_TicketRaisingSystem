const express = require('express');
const router = express.Router();
const { getCommentsByTicket, addComment } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:ticketId', protect, getCommentsByTicket);
router.post('/', protect, addComment);

module.exports = router;
