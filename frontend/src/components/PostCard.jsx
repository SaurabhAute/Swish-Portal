import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toggleLike } from '../services/api';

/**
 * PostCard — displays a single post in the feed.
 *
 * Props:
 *   post       - post object from the API
 *   onDelete   - callback(postId) when the user deletes their own post
 *
 * Extension points for the Engagement teammate (Person 3):
 *   - LIKE_BUTTON_SLOT: Replace the placeholder with a real LikeButton component
 *   - COMMENT_SECTION_SLOT: Drop in a CommentSection component below the card content
 */
const PostCard = ({ post, onDelete }) => {
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Likes state (Person 3 - FR-05, AC-03)
  const [optimisticLike, setOptimisticLike] = useState(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const [likeError, setLikeError] = useState('');

  const isLiked = optimisticLike !== null ? optimisticLike.liked : Boolean(post.likedByMe);
  const currentLikeCount = optimisticLike !== null
    ? optimisticLike.count
    : (post.likeCount ?? (Array.isArray(post.likes) ? post.likes.length : 0));

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    setLikeError('');

    // Optimistic UI update
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1);
    setOptimisticLike({ liked: nextLiked, count: nextCount });

    try {
      const res = await toggleLike(post._id);
      if (res && typeof res.liked === 'boolean' && typeof res.likeCount === 'number') {
        setOptimisticLike({ liked: res.liked, count: res.likeCount });
      }
    } catch (err) {
      // Rollback on failure
      setOptimisticLike(null);
      setLikeError(err.response?.data?.message || 'Failed to update like. Please try again.');
    } finally {
      setLikeLoading(false);
    }
  };

  const currentUserId = user?._id || user?.id;
  const postAuthorId = post.author?.id || post.authorId;
  const isOwner = Boolean(currentUserId && postAuthorId && String(currentUserId) === String(postAuthorId));

  const authorName = post.author?.name || 'Unknown';
  const authorAvatar = post.author?.profilePhotoUrl || '';
  const initials = authorName
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  // Relative timestamp
  const timeAgo = getRelativeTime(post.createdAt);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(post._id);
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <article className="post-card" aria-label={`Post by ${authorName}`}>
      {/* ── Author Header ──────────────────────── */}
      <div className="post-card-header">
        <Link
          to={`/profile/${postAuthorId}`}
          className="post-author-link"
          aria-label={`View ${authorName}'s profile`}
        >
          {authorAvatar ? (
            <img src={authorAvatar} alt={`${authorName}'s avatar`} className="post-avatar-img" />
          ) : (
            <div className="post-avatar-fallback" aria-hidden="true">{initials}</div>
          )}
          <div className="post-author-info">
            <span className="post-author-name">{authorName}</span>
            <span className="post-timestamp">{timeAgo}</span>
          </div>
        </Link>

        {isOwner && (
          <div className="post-actions-menu">
            {showDeleteConfirm ? (
              <div className="post-delete-confirm">
                <span className="delete-confirm-text">Delete this post?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-danger-sm"
                  aria-label="Confirm delete post"
                >
                  {deleting ? 'Deleting…' : 'Yes'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-outline-sm"
                  aria-label="Cancel delete"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-outline-sm btn-delete-trigger"
                aria-label="Delete post"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Post Image ─────────────────────────── */}
      <div className="post-image-container">
        <img
          src={post.imageUrl}
          alt={post.caption ? `Post: ${post.caption.slice(0, 80)}` : `Photo by ${authorName}`}
          className="post-image"
          loading="lazy"
        />
      </div>

      {/* ── Caption ────────────────────────────── */}
      {post.caption && (
        <div className="post-caption">
          <span className="post-caption-author">{authorName}</span>{' '}
          {post.caption}
        </div>
      )}

      {/* ── Engagement Row ──────────────────────────── */}
      <div className="post-engagement-row">
        {likeError && (
          <div className="like-error-tooltip" role="alert">
            <span>⚠️ {likeError}</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleLike}
          disabled={likeLoading}
          aria-pressed={isLiked}
          aria-label={isLiked ? `Unlike post (${currentLikeCount} likes)` : `Like post (${currentLikeCount} likes)`}
          className={`btn-like ${isLiked ? 'btn-like-active' : ''}`}
        >
          <svg
            className={`like-heart-icon ${isLiked ? 'heart-liked' : ''}`}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={isLiked ? '#ec4899' : 'none'}
            stroke={isLiked ? '#ec4899' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span className="like-count-text">
            {currentLikeCount} {currentLikeCount === 1 ? 'like' : 'likes'}
          </span>
        </button>

        <span className="post-comment-count">
          {post.commentCount || 0} {post.commentCount === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      {/* ── COMMENT_SECTION_SLOT ───────────────── */}
      {/*
       * Person 3 (Engagement): Drop your CommentSection component here.
       * Available data: post._id, post.commentCount
       * Example: <CommentSection postId={post._id} />
       */}
    </article>
  );
};

/**
 * Returns a human-readable relative time string.
 */
function getRelativeTime(dateStr) {
  if (!dateStr) return 'just now';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: diffDay > 365 ? 'numeric' : undefined,
  });
}

export default PostCard;
