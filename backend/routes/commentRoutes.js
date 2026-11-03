const express = require('express');
const router = express.Router();
const { deleteComment } = require('../controllers/commentController');
const verifyToken = require('../middleware/verifyToken');

// All comment routes require authentication
router.use(verifyToken);

// DELETE /api/comments/:id — delete own comment
router.delete('/:id', deleteComment);

module.exports = router;
