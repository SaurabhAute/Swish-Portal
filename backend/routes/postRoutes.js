const express = require('express');
const router = express.Router();
const {
  createPost,
  getFeed,
  getUserPosts,
  deletePost,
  toggleLike,
} = require('../controllers/postController');
const {
  addComment,
  getComments,
} = require('../controllers/commentController');
const verifyToken = require('../middleware/verifyToken');
const uploadImage = require('../middleware/uploadImage');

// All post routes require authentication
router.use(verifyToken);

// POST /api/posts — create a new post (multipart/form-data with "image" field)
router.post('/', uploadImage, createPost);

// GET /api/posts — campus feed (newest first, cursor-based pagination)
router.get('/', getFeed);

// GET /api/posts/user/:userId — posts by a specific user
router.get('/user/:userId', getUserPosts);

// POST /api/posts/:id/like — toggle like on post
router.post('/:id/like', toggleLike);

// POST /api/posts/:postId/comments — add a comment
router.post('/:postId/comments', addComment);

// GET /api/posts/:postId/comments — get paginated comments
router.get('/:postId/comments', getComments);

// DELETE /api/posts/:id — delete own post
router.delete('/:id', deletePost);

module.exports = router;
