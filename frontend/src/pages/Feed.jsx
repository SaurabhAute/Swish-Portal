import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postService } from '../services/api';
import PostCard from '../components/PostCard';

const Feed = () => {
  const { user, logout } = useAuth();

  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const userInitial = user?.profile?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || '?';

  // Load initial feed
  const loadFeed = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await postService.getFeed({ limit: 10 });
      setPosts(data.posts);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    postService.getFeed({ limit: 10 })
      .then((data) => {
        if (isMounted) {
          setPosts(data.posts);
          setNextCursor(data.nextCursor);
          setHasMore(data.hasMore);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load feed');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, []);

  // Load more posts
  const loadMore = async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await postService.getFeed({ limit: 10, cursor: nextCursor });
      setPosts((prev) => [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load more posts');
    } finally {
      setLoadingMore(false);
    }
  };

  // Delete post handler
  const handleDelete = async (postId) => {
    await postService.deletePost(postId);
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  return (
    <div className="profile-page-wrapper">
      {/* Navigation Header */}
      <header className="profile-nav-header">
        <div className="nav-brand">
          <Link to="/dashboard" className="brand-logo-text">SWISH</Link>
          <span className="nav-badge">v1.0</span>
        </div>

        <nav className="nav-links">
          <Link to="/dashboard" className="nav-item nav-item-active">Feed</Link>
          <Link to="/create" className="nav-item">Create</Link>
          <Link to="/profile" className="nav-item">Profile</Link>
        </nav>

        <div className="nav-user-actions">
          <Link to="/profile" className="nav-user-info" style={{ textDecoration: 'none' }}>
            {user?.profile?.avatar ? (
              <img src={user.profile.avatar} alt="Avatar" className="nav-avatar-img" />
            ) : (
              <div className="nav-avatar-fallback">{userInitial}</div>
            )}
            <span className="nav-username">
              {user?.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}` : user?.email}
            </span>
          </Link>
          <button onClick={logout} className="btn-outline btn-logout">Logout</button>
        </div>
      </header>

      <main className="feed-main-container">
        {/* Create Post CTA */}
        <div className="feed-create-cta">
          <div className="feed-cta-left">
            {user?.profile?.avatar ? (
              <img src={user.profile.avatar} alt="" className="post-avatar-img" />
            ) : (
              <div className="post-avatar-fallback">{userInitial}</div>
            )}
            <span className="feed-cta-text">What's on your mind?</span>
          </div>
          <Link to="/create" className="btn-primary" style={{ textDecoration: 'none', padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}>
            📷 New Post
          </Link>
        </div>

        {/* ── Feed Content ─────────────────────── */}
        {loading ? (
          <div className="feed-loading" role="status" aria-label="Loading feed">
            <svg className="spinner" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round" />
            </svg>
            <p>Loading feed…</p>
          </div>
        ) : error ? (
          <div className="feed-error" role="alert">
            <p>⚠️ {error}</p>
            <button onClick={loadFeed} className="btn-outline" style={{ marginTop: '0.75rem' }}>
              Try Again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="feed-empty">
            <div className="feed-empty-icon">📸</div>
            <h3>No posts yet</h3>
            <p>Be the first to share a moment with your campus community!</p>
            <Link to="/create" className="btn-primary" style={{ textDecoration: 'none', marginTop: '1rem', display: 'inline-flex', padding: '0.65rem 1.5rem' }}>
              Create Your First Post
            </Link>
          </div>
        ) : (
          <>
            <div className="feed-posts-list">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} onDelete={handleDelete} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="feed-load-more">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-outline"
                  style={{ padding: '0.65rem 2rem' }}
                >
                  {loadingMore ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Feed;
