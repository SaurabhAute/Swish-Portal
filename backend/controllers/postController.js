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

    let caption = '';
    if (req.body.caption) {
      caption = req.body.caption.trim();
      if (caption.length > 500) {
        return res.status(400).json({ message: 'Caption cannot exceed 500 characters' });
      }
    }

    const post = await Post.create({
      authorId: req.user._id || req.user.id,
      imageUrl: req.file.path,
      imagePublicId: req.file.filename,
      caption,
    });

    // Populate author summary for the response
    await post.populate({
      path: 'authorId',
      select: 'profile.firstName profile.lastName profile.avatar email',
    });

    const currentUserId = req.user?._id || req.user?.id;

    res.status(201).json({
      message: 'Post created successfully',
      post: formatPost(post, currentUserId),
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
    const currentUserId = req.user?._id || req.user?.id;

    res.status(200).json({
      posts: slicedPosts.map((p) => formatPost(p, currentUserId)),
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
    const currentUserId = req.user?._id || req.user?.id;

    res.status(200).json({
      posts: slicedPosts.map((p) => formatPost(p, currentUserId)),
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
    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id.toString();
    if (post.authorId.toString() !== currentUserId) {
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

// @desc    Toggle like for a post (atomic $addToSet / $pull)
// @route   POST /api/posts/:id/like
// @access  Private
const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(id);
    if (!post || post.isRemoved) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const currentUserId = req.user._id || req.user.id;
    const currentUserIdStr = currentUserId.toString();

    const alreadyLiked = Array.isArray(post.likes) && post.likes.some(
      (likerId) => (likerId && likerId.toString() === currentUserIdStr)
    );

    let updatedPost;
    if (alreadyLiked) {
      updatedPost = await Post.findOneAndUpdate(
        { _id: id, isRemoved: { $ne: true } },
        { $pull: { likes: currentUserId } },
        { new: true }
      );
    } else {
      updatedPost = await Post.findOneAndUpdate(
        { _id: id, isRemoved: { $ne: true } },
        { $addToSet: { likes: currentUserId } },
        { new: true }
      );
    }

    if (!updatedPost || updatedPost.isRemoved) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const liked = Array.isArray(updatedPost.likes) && updatedPost.likes.some(
      (likerId) => (likerId && likerId.toString() === currentUserIdStr)
    );
    const likeCount = Array.isArray(updatedPost.likes) ? updatedPost.likes.length : 0;

    // Notification hook point for Person 5 (Notifications/Infra):
    // if (liked && post.authorId.toString() !== currentUserIdStr) {
    //   await createNotification({ recipient: post.authorId, sender: currentUserId, type: 'like', post: post._id });
    // }

    res.status(200).json({
      liked,
      likeCount,
    });
  } catch (error) {
    console.error('toggleLike error:', error.message);
    res.status(500).json({ message: 'Server error while toggling like' });
  }
};

/**
 * Format a post document for API responses.
 * Extracts author summary; never exposes sensitive user fields.
 * Includes computed likeCount and likedByMe without sending raw liker IDs.
 */
function formatPost(post, currentUserId) {
  const author = post.authorId;
  const isPopulated = author && typeof author === 'object' && author._id;
  const authorSummary = isPopulated
    ? {
        id: author._id,
        name: `${author.profile?.firstName || ''} ${author.profile?.lastName || ''}`.trim() || author.email?.split('@')[0] || 'Unknown',
        profilePhotoUrl: author.profile?.avatar || '',
      }
    : { id: author || null, name: 'Unknown', profilePhotoUrl: '' };

  const likesArray = Array.isArray(post.likes) ? post.likes : [];
  const currentUserIdStr = currentUserId ? currentUserId.toString() : null;
  const likedByMe = Boolean(
    currentUserIdStr &&
    likesArray.some((likerId) => {
      const idStr = likerId && likerId._id ? likerId._id.toString() : likerId ? likerId.toString() : null;
      return idStr === currentUserIdStr;
    })
  );

  return {
    _id: post._id,
    authorId: authorSummary.id,
    author: authorSummary,
    imageUrl: post.imageUrl,
    imagePublicId: post.imagePublicId,
    caption: post.caption,
    likeCount: likesArray.length,
    likedByMe,
    commentCount: post.commentCount || 0,
    isRemoved: post.isRemoved,
    createdAt: post.createdAt,
  };
}

module.exports = {
  createPost,
  getFeed,
  getUserPosts,
  deletePost,
  toggleLike,
};
