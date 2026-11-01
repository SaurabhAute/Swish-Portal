import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

      {/* ── LIKE_BUTTON_SLOT ───────────────────── */}
      {/*
       * Person 3 (Engagement): Drop your LikeButton component here.
       * Available data: post._id, post.likes (array of user ObjectIds)
       * Example: <LikeButton postId={post._id} likes={post.likes} />
       */}
      <div className="post-engagement-row">
        <span className="post-like-count">
          {post.likes?.length || 0} {post.likes?.length === 1 ? 'like' : 'likes'}
        </span>
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
