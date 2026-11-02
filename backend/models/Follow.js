const mongoose = require('mongoose');

const followSchema = new mongoose.Schema(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Follower ID is required'],
      index: true,
    },
    followingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Following ID is required'],
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

// UNIQUE compound index on (followerId, followingId) so duplicates are impossible
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followSchema.index({ followingId: 1, createdAt: -1 });
followSchema.index({ followerId: 1, createdAt: -1 });

module.exports = mongoose.model('Follow', followSchema);
