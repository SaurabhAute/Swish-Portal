const mongoose = require('mongoose');
const Post = require('../models/Post');
const cloudinary = require('../config/cloudinary');

// @desc    Create a new post (image + caption)
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    // Ensure an image was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required. Please upload an image file.' });
    }

    const caption = req.body.caption ? req.body.caption.trim().slice(0, 500) : '';

    const post = await Post.create({
      authorId: req.user._id,
      imageUrl: req.file.path,
      imagePublicId: req.file.filename,
      caption,
    });

    // Populate author summary for the response
    await post.populate({
      path: 'authorId',
      select: 'profile.firstName profile.lastName profile.avatar email',
    });

    res.status(201).json({
      message: 'Post created successfully',
      post: formatPost(post),
    });
  } catch (error) {
    console.error('createPost error:', error.message);
    res.status(500).json({ message: 'Server error while creating post' });
  }
};

// @desc    Get the campus feed (all posts, newest first, paginated)
// @route   GET /api/posts
// @access  Private
const getFeed = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const cursor = req.query.cursor; // cursor is the _id of the last post from the previous page

    const query = { isRemoved: { $ne: true } };

    // Cursor-based pagination: fetch posts older than the cursor
    if (cursor) {
      if (!mongoose.Types.ObjectId.isValid(cursor)) {
        return res.status(400).json({ message: 'Invalid cursor value' });
      }
      const cursorPost = await Post.findById(cursor).select('createdAt');
      if (cursorPost) {
        query.createdAt = { $lt: cursorPost.createdAt };
      }
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1) // fetch one extra to determine hasMore
      .populate({
        path: 'authorId',
        select: 'profile.firstName profile.lastName profile.avatar email',
      });

    const hasMore = posts.length > limit;
    const slicedPosts = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? slicedPosts[slicedPosts.length - 1]._id : null;

    res.status(200).json({
      posts: slicedPosts.map(formatPost),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('getFeed error:', error.message);
    res.status(500).json({ message: 'Server error while fetching feed' });
  }
};

// @desc    Get posts by a specific user
// @route   GET /api/posts/user/:userId
// @access  Private
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const cursor = req.query.cursor;

    const query = { authorId: userId, isRemoved: { $ne: true } };

    if (cursor) {
      if (!mongoose.Types.ObjectId.isValid(cursor)) {
        return res.status(400).json({ message: 'Invalid cursor value' });
      }
      const cursorPost = await Post.findById(cursor).select('createdAt');
      if (cursorPost) {
        query.createdAt = { $lt: cursorPost.createdAt };
      }
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate({
        path: 'authorId',
        select: 'profile.firstName profile.lastName profile.avatar email',
      });

    const hasMore = posts.length > limit;
    const slicedPosts = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? slicedPosts[slicedPosts.length - 1]._id : null;

    res.status(200).json({
      posts: slicedPosts.map(formatPost),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('getUserPosts error:', error.message);
    res.status(500).json({ message: 'Server error while fetching user posts' });
  }
};

// @desc    Delete a post (author only — admin moderation is another teammate's job)
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only the author can delete their own post
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    // Delete the image from Cloudinary
    try {
      await cloudinary.uploader.destroy(post.imagePublicId);
    } catch (cloudErr) {
      console.error('Cloudinary delete error:', cloudErr.message);
      // Continue with post deletion even if Cloudinary cleanup fails
    }

    await Post.findByIdAndDelete(id);

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('deletePost error:', error.message);
    res.status(500).json({ message: 'Server error while deleting post' });
  }
};

/**
 * Format a post document for API responses.
 * Extracts author summary; never exposes sensitive user fields.
 */
function formatPost(post) {
  const author = post.authorId;
  const authorSummary = author
    ? {
        id: author._id,
        name: `${author.profile?.firstName || ''} ${author.profile?.lastName || ''}`.trim() || author.email?.split('@')[0] || 'Unknown',
        profilePhotoUrl: author.profile?.avatar || '',
      }
    : { id: null, name: 'Unknown', profilePhotoUrl: '' };

  return {
    _id: post._id,
    authorId: authorSummary.id,
    author: authorSummary,
    imageUrl: post.imageUrl,
    imagePublicId: post.imagePublicId,
    caption: post.caption,
    likes: post.likes,
    commentCount: post.commentCount,
    isRemoved: post.isRemoved,
    createdAt: post.createdAt,
  };
}

module.exports = {
  createPost,
  getFeed,
  getUserPosts,
  deletePost,
};
