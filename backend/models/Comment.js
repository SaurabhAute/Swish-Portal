const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post ID is required'],
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [300, 'Comment cannot exceed 300 characters'],
    },
    isRemoved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

// Indexes on postId and createdAt for efficient paginated retrieval
commentSchema.index({ postId: 1, createdAt: 1 });
commentSchema.index({ postId: 1, isRemoved: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
