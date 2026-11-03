import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getComments, addComment, deleteComment } from '../services/api';

/**
 * CommentSection — expandable comment thread for PostCard.
 *
 * Implements FR-06, AC-04:
 * - Paginated list (oldest first, Load More cursor)
 * - Empty, loading, and error-with-retry states
 * - 300-character counter and validation
 * - Instant update on new comment submission
 * - Author-only delete with confirmation
 */
const CommentSection = ({ postId, isOpen, onCommentCountChange }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState('');

  // Comment input form
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Delete comment state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const currentUserId = user?._id || user?.id;
  const hasFetched = useRef(false);

  // Fetch comments when opened
  useEffect(() => {
    if (!isOpen || hasFetched.current) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    getComments(postId, { limit: 10 })
      .then((data) => {
        if (isMounted) {
          setComments(data.comments || []);
          setNextCursor(data.nextCursor);
          setHasMore(Boolean(data.hasMore));
          hasFetched.current = true;
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load comments');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [isOpen, postId]);

  const handleRetry = () => {
    setLoading(true);
    setError('');
    getComments(postId, { limit: 10 })
      .then((data) => {
        setComments(data.comments || []);
        setNextCursor(data.nextCursor);
        setHasMore(Boolean(data.hasMore));
        hasFetched.current = true;
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load comments');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await getComments(postId, { limit: 10, cursor: nextCursor });
      setComments((prev) => [...prev, ...(data.comments || [])]);
      setNextCursor(data.nextCursor);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load more comments');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 300 || submitting) return;

    setSubmitting(true);
    setFeedbackMsg({ type: '', text: '' });

    try {
      const data = await addComment(postId, trimmed);
      const newComment = data.comment;
      setComments((prev) => [...prev, newComment]);
      setText('');
      setFeedbackMsg({ type: 'success', text: 'Comment posted!' });
      if (onCommentCountChange) {
        onCommentCountChange((prev) => prev + 1);
      }
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to post comment',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    setDeletingId(commentId);
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      setConfirmDeleteId(null);
      if (onCommentCountChange) {
        onCommentCountChange((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete comment');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <section className="comments-section" id={`comments-${postId}`} aria-label="Comments">
      {/* ── New Comment Form ─────────────────── */}
      <form onSubmit={handleSubmit} className="comment-form">
        <div className="comment-input-wrapper">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            rows="2"
            maxLength={300}
            className="comment-textarea"
            aria-label="Write a comment"
            disabled={submitting}
          />
          <div className="comment-form-footer">
            <span
              className={`comment-char-count ${text.length > 280 ? 'char-warning' : ''}`}
              aria-live="polite"
            >
              {text.length}/300
            </span>
            <button
              type="submit"
              disabled={submitting || !text.trim() || text.length > 300}
              className="btn-primary-sm btn-submit-comment"
              aria-label="Submit comment"
            >
              {submitting ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </div>

        {feedbackMsg.text && (
          <div
            className={`comment-feedback-banner ${
              feedbackMsg.type === 'success' ? 'feedback-success' : 'feedback-error'
            }`}
            role="alert"
          >
            {feedbackMsg.type === 'success' ? '✓ ' : '⚠️ '}
            {feedbackMsg.text}
          </div>
        )}
      </form>

      {/* ── Comment List ─────────────────────── */}
      {loading ? (
        <div className="comments-loading" role="status" aria-label="Loading comments">
          <svg
            className="spinner"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-purple)"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round" />
          </svg>
          <span>Loading comments…</span>
        </div>
      ) : error ? (
        <div className="comments-error" role="alert">
          <p>⚠️ {error}</p>
          <button type="button" onClick={handleRetry} className="btn-outline-sm">
            Try Again
          </button>
        </div>
      ) : comments.length === 0 ? (
        <div className="comments-empty">
          <p>No comments yet. Be the first to start the conversation!</p>
        </div>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => {
            const author = comment.author || {};
            const authorId = author.id || comment.authorId;
            const authorName = author.name || 'Unknown';
            const authorAvatar = author.profilePhotoUrl || '';
            const isCommentOwner = Boolean(
              currentUserId && authorId && String(currentUserId) === String(authorId)
            );
            const initials = authorName
              .split(' ')
              .map((w) => w.charAt(0))
              .join('')
              .toUpperCase()
              .slice(0, 2) || '?';

            return (
              <div key={comment._id} className="comment-item">
                <Link
                  to={`/profile/${authorId}`}
                  className="comment-avatar-link"
                  aria-label={`View ${authorName}'s profile`}
                >
                  {authorAvatar ? (
                    <img src={authorAvatar} alt="" className="comment-avatar-img" />
                  ) : (
                    <div className="comment-avatar-fallback" aria-hidden="true">
                      {initials}
                    </div>
                  )}
                </Link>

                <div className="comment-bubble">
                  <div className="comment-bubble-header">
                    <Link to={`/profile/${authorId}`} className="comment-author-name">
                      {authorName}
                    </Link>
                    <span className="comment-timestamp">
                      {formatCommentTime(comment.createdAt)}
                    </span>

                    {isCommentOwner && (
                      <div className="comment-owner-actions">
                        {confirmDeleteId === comment._id ? (
                          <div className="comment-delete-confirm">
                            <span className="confirm-prompt">Delete?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(comment._id)}
                              disabled={deletingId === comment._id}
                              className="btn-danger-xs"
                              aria-label="Confirm delete comment"
                            >
                              {deletingId === comment._id ? '…' : 'Yes'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="btn-outline-xs"
                              aria-label="Cancel delete"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(comment._id)}
                            className="btn-comment-delete"
                            title="Delete comment"
                            aria-label="Delete comment"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="comment-text">{comment.text}</p>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div className="comments-load-more">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn-outline-sm btn-more-comments"
              >
                {loadingMore ? 'Loading more…' : 'Load more comments'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

function formatCommentTime(dateStr) {
  if (!dateStr) return 'just now';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default CommentSection;
