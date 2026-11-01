const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getUserById,
  getAllUsers,
} = require('../controllers/userController');
const { changePassword } = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');

// All routes here are protected by verifyToken
router.use(verifyToken);

// Profile CRUD endpoints (FR-02)
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.delete('/profile', deleteUserProfile);

// Password change endpoint
router.put('/change-password', changePassword);

// User lookup endpoints
router.get('/', getAllUsers);
router.get('/:id', getUserById);

module.exports = router;
