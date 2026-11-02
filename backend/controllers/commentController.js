const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');

// @desc    Add a comment to a post
// @route   POST /api/posts/:postId/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(postId);
    if (!post || post.isRemoved) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const rawText = req.body && req.body.text !== undefined ? req.body.text : '';
    const text = typeof rawText === 'string' ? rawText.trim() : '';

    if (!text || text.length === 0) {
      return res.status(400).json({ message: 'Comment text cannot be empty' });
    }

    if (text.length > 300) {
      return res.status(400).json({ message: 'Comment cannot exceed 300 characters' });
    }

    // Author ID is taken strictly from req.user, never from the request body
    const currentUserId = req.user._id || req.user.id;

    const comment = await Comment.create({
      postId,
      authorId: currentUserId,
      text,
    });

    // Atomically increment the post's commentCount
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

    // Populate author summary for response
    await comment.populate({
      path: 'authorId',
      select: 'profile.firstName profile.lastName profile.avatar email',
    });

    // Notification hook point for Person 5 (Notifications/Infra):
    // if (post.authorId.toString() !== currentUserId.toString()) {
    //   await createNotification({ recipient: post.authorId, sender: currentUserId, type: 'comment', post: post._id, comment: comment._id });
    // }

    res.status(201).json({
      message: 'Comment added successfully',
      comment: formatComment(comment),
    });
  } catch (error) {
    console.error('addComment error:', error.message);
    res.status(500).json({ message: 'Server error while adding comment' });
  }
};

// @desc    Get comments for a post (paginated, oldest first, excludes isRemoved)
// @route   GET /api/posts/:postId/comments
// @access  Private
const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(postId);
    if (!post || post.isRemoved) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const cursor = req.query.cursor;

    const query = { postId, isRemoved: { $ne: true } };

    if (cursor) {
      if (!mongoose.Types.ObjectId.isValid(cursor)) {
        return res.status(400).json({ message: 'Invalid cursor value' });
      }
      const cursorComment = await Comment.findById(cursor).select('createdAt');
      if (cursorComment) {
        query.createdAt = { $gt: cursorComment.createdAt };
      }
    }

    const comments = await Comment.find(query)
      .sort({ createdAt: 1 })
      .limit(limit + 1)
      .populate({
        path: 'authorId',
        select: 'profile.firstName profile.lastName profile.avatar email',
      });

    const hasMore = comments.length > limit;
    const slicedComments = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? slicedComments[slicedComments.length - 1]._id : null;

    res.status(200).json({
      comments: slicedComments.map(formatComment),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('getComments error:', error.message);
    res.status(500).json({ message: 'Server error while fetching comments' });
  }
};

// @desc    Delete a comment (author only)
// @route   DELETE /api/comments/:id
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Only the author can delete their comment
    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id.toString();
    if (comment.authorId.toString() !== currentUserId) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    await Comment.findByIdAndDelete(id);

    // Atomically decrement commentCount
    await Post.findOneAndUpdate(
      { _id: comment.postId, commentCount: { $gt: 0 } },
      { $inc: { commentCount: -1 } }
    );

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('deleteComment error:', error.message);
    res.status(500).json({ message: 'Server error while deleting comment' });
  }
};

/**
 * Format a comment document for API responses.
 * Extracts author summary; never exposes sensitive user fields.
 */
function formatComment(comment) {
  const author = comment.authorId;
  const isPopulated = author && typeof author === 'object' && author._id;
  const authorSummary = isPopulated
    ? {
        id: author._id,
        name: `${author.profile?.firstName || ''} ${author.profile?.lastName || ''}`.trim() || author.email?.split('@')[0] || 'Unknown',
        profilePhotoUrl: author.profile?.avatar || '',
      }
    : { id: author || null, name: 'Unknown', profilePhotoUrl: '' };

  return {
    _id: comment._id,
    postId: comment.postId,
    authorId: authorSummary.id,
    author: authorSummary,
    text: comment.text,
    isRemoved: comment.isRemoved,
    createdAt: comment.createdAt,
  };
}

module.exports = {
  addComment,
  getComments,
  deleteComment,
  formatComment,
};
