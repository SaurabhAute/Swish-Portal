const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    imagePublicId: {
      type: String,
      required: [true, 'Image public ID is required'],
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [500, 'Caption cannot exceed 500 characters'],
      default: '',
    },
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    commentCount: {
      type: Number,
      default: 0,
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

// Index for feed queries — newest first, excluding removed posts
postSchema.index({ createdAt: -1 });
postSchema.index({ isRemoved: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
