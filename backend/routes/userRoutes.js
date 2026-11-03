const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getUserById,
  getAllUsers,
} = require('../controllers/userController');
const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} = require('../controllers/followController');
const { changePassword } = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');

// All routes here are protected by verifyToken
router.use(verifyToken);

// Profile CRUD endpoints (FR-02)
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.delete('/profile', deleteUserProfile);

// Convenience aliases for Person 2 / SRS requirements
router.get('/me', getUserProfile);
router.put('/me', updateUserProfile);

// Password change endpoint
router.put('/change-password', changePassword);

// Follow endpoints (Person 3 - FR-07, AC-05)
router.post('/:id/follow', followUser);
router.delete('/:id/follow', unfollowUser);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

// User lookup endpoints
router.get('/', getAllUsers);
router.get('/:id', getUserById);

module.exports = router;
