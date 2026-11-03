const mongoose = require('mongoose');
const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/users/profile, GET /api/users/me
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('getUserProfile error:', error.message);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

// @desc    Update current user profile (bio, photo, basic info) - FR-02
// @route   PUT /api/users/profile, PUT /api/users/me
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { firstName, lastName, bio, avatar, phone } = req.body;

    // Validate bio length
    if (bio && bio.length > 500) {
      return res.status(400).json({ message: 'Bio cannot exceed 500 characters' });
    }

    // Avatar validation (NFR-03)
    if (avatar) {
      if (avatar.startsWith('data:image/')) {
        const matches = avatar.match(/^data:image\/(jpeg|png|webp|gif);base64,/);
        if (!matches) {
          return res.status(400).json({ message: 'Only JPEG, PNG, WebP, and GIF images are allowed' });
        }
        if (avatar.length > 3 * 1024 * 1024) {
          return res.status(400).json({ message: 'Image size should be under 2MB' });
        }
      } else if (!avatar.startsWith('http://') && !avatar.startsWith('https://')) {
        return res.status(400).json({ message: 'Invalid photo URL format' });
      }
    }

    // Update profile fields if provided
    if (user.profile) {
      if (firstName !== undefined) user.profile.firstName = firstName.trim();
      if (lastName !== undefined) user.profile.lastName = lastName.trim();
      if (bio !== undefined) user.profile.bio = bio.trim();
      if (avatar !== undefined) user.profile.avatar = avatar;
      if (phone !== undefined) user.profile.phone = phone.trim();
    } else {
      user.profile = {
        firstName: firstName ? firstName.trim() : '',
        lastName: lastName ? lastName.trim() : '',
        bio: bio ? bio.trim() : '',
        avatar: avatar || '',
        phone: phone ? phone.trim() : '',
      };
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('updateUserProfile error:', error.message);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

// @desc    Delete current user account / profile
// @route   DELETE /api/users/profile
// @access  Private
const deleteUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({
      success: true,
      message: 'User account and profile deleted successfully',
    });
  } catch (error) {
    console.error('deleteUserProfile error:', error.message);
    res.status(500).json({ message: 'Server error while deleting account' });
  }
};

// @desc    Get user by ID (Public profile)
// @route   GET /api/users/:id
// @access  Private (or Public)
const getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(req.params.id).select('-resetPasswordToken -resetPasswordExpire');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isOwn = req.user && req.user._id && req.user._id.toString() === user._id.toString();
    const userObj = user.toJSON();

    if (!isOwn) {
      delete userObj.email;
      if (userObj.profile) {
        delete userObj.profile.phone;
      }
    }

    res.status(200).json({
      success: true,
      user: userObj,
    });
  } catch (error) {
    console.error('getUserById error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error while fetching user' });
  }
};

// @desc    Get all users (with search and pagination support for discovery/admin)
// @route   GET /api/users
// @access  Private
const getAllUsers = async (req, res) => {
  try {
    const { search, limit = 20, page = 1 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
      ];
    }

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const users = await User.find(query)
      .limit(parsedLimit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      users,
    });
  } catch (error) {
    console.error('getAllUsers error:', error.message);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getUserById,
  getAllUsers,
};
