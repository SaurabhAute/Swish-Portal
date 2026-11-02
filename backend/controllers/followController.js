const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');

// @desc    Follow a user (idempotent)
// @route   POST /api/users/:id/follow
// @access  Private
const followUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const currentUserId = req.user._id || req.user.id;
    if (currentUserId.toString() === id.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Idempotent follow using unique compound index
    try {
      await Follow.create({
        followerId: currentUserId,
        followingId: id,
      });
    } catch (err) {
      // 11000 is duplicate key error in MongoDB (already following)
      if (err.code !== 11000) {
        throw err;
      }
    }

    const followersCount = await Follow.countDocuments({ followingId: id });
    const followingCount = await Follow.countDocuments({ followerId: currentUserId });

    // Notification hook point for Person 5 (Notifications/Infra):
    // await createNotification({ recipient: id, sender: currentUserId, type: 'follow' });

    res.status(200).json({
      success: true,
      message: 'User followed successfully',
      isFollowing: true,
      followersCount,
      followingCount,
    });
  } catch (error) {
    console.error('followUser error:', error.message);
    res.status(500).json({ message: 'Server error while following user' });
  }
};

// @desc    Unfollow a user (idempotent)
// @route   DELETE /api/users/:id/follow
// @access  Private
const unfollowUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const currentUserId = req.user._id || req.user.id;
    if (currentUserId.toString() === id.toString()) {
      return res.status(400).json({ message: 'You cannot unfollow yourself' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Idempotent unfollow
    await Follow.findOneAndDelete({
      followerId: currentUserId,
      followingId: id,
    });

    const followersCount = await Follow.countDocuments({ followingId: id });
    const followingCount = await Follow.countDocuments({ followerId: currentUserId });

    res.status(200).json({
      success: true,
      message: 'User unfollowed successfully',
      isFollowing: false,
      followersCount,
      followingCount,
    });
  } catch (error) {
    console.error('unfollowUser error:', error.message);
    res.status(500).json({ message: 'Server error while unfollowing user' });
  }
};

// @desc    Get paginated followers of a user
// @route   GET /api/users/:id/followers
// @access  Private
const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const follows = await Follow.find({ followingId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'followerId',
        select: 'profile.firstName profile.lastName profile.avatar role',
      });

    const total = await Follow.countDocuments({ followingId: id });

    const users = follows
      .filter((f) => f.followerId)
      .map((f) => {
        const u = f.followerId;
        return {
          id: u._id,
          name: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || 'Unknown',
          profilePhotoUrl: u.profile?.avatar || '',
          role: u.role || 'user',
        };
      });

    res.status(200).json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: skip + follows.length < total,
    });
  } catch (error) {
    console.error('getFollowers error:', error.message);
    res.status(500).json({ message: 'Server error while fetching followers' });
  }
};

// @desc    Get paginated following of a user
// @route   GET /api/users/:id/following
// @access  Private
const getFollowing = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const follows = await Follow.find({ followerId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'followingId',
        select: 'profile.firstName profile.lastName profile.avatar role',
      });

    const total = await Follow.countDocuments({ followerId: id });

    const users = follows
      .filter((f) => f.followingId)
      .map((f) => {
        const u = f.followingId;
        return {
          id: u._id,
          name: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || 'Unknown',
          profilePhotoUrl: u.profile?.avatar || '',
          role: u.role || 'user',
        };
      });

    res.status(200).json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: skip + follows.length < total,
    });
  } catch (error) {
    console.error('getFollowing error:', error.message);
    res.status(500).json({ message: 'Server error while fetching following' });
  }
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
};
