import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postService } from '../services/api';

const MAX_CAPTION = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const PostUpload = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userInitial = user?.profile?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || '?';

  // Validate and preview image
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setError('');

    if (!file) {
      setImageFile(null);
      setImagePreview('');
      return;
    }

    // Client-side type check
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      setImageFile(null);
      setImagePreview('');
      return;
    }

    // Client-side size check
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 5 MB.');
      setImageFile(null);
      setImagePreview('');
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!imageFile) {
      setError('Please select an image to upload.');
      return;
    }

    setLoading(true);

    try {
      await postService.createPost(imageFile, caption);
      setSuccess('Post created successfully! Redirecting to feed…');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post. Please try again.');
      setLoading(false);
    }
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
          <Link to="/dashboard" className="nav-item">Feed</Link>
          <Link to="/create" className="nav-item nav-item-active">Create</Link>
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

      <main className="profile-main-container">
        <div className="tab-pane-card" style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div className="pane-header">
            <h3>Create New Post</h3>
            <p>Share a moment with your campus community</p>
          </div>

          {/* Feedback banners */}
          {error && (
            <div className="notification-banner notif-error" role="alert">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="notification-banner notif-success" role="status">
              ✓ {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Image Upload */}
            <div className="avatar-edit-section">
              <label className="section-label" htmlFor="post-image-input">
                Photo <span style={{ color: 'var(--error)' }}>*</span>
              </label>

              {imagePreview ? (
                <div className="post-upload-preview">
                  <img src={imagePreview} alt="Preview of post" className="post-preview-img" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="btn-outline btn-remove-photo"
                    aria-label="Remove selected image"
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <div
                  className="post-upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                  role="button"
                  tabIndex={0}
                  aria-label="Click to select an image"
                >
                  <div className="dropzone-icon">📷</div>
                  <p className="dropzone-text">Click to select an image</p>
                  <span className="field-hint">JPEG, PNG, or WebP · Max 5 MB</span>
                </div>
              )}

              <input
                id="post-image-input"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
              />
            </div>

            {/* Caption */}
            <div className="input-field-group">
              <div className="field-label-row">
                <label htmlFor="post-caption">Caption</label>
                <span className="char-count" aria-live="polite">{caption.length}/{MAX_CAPTION}</span>
              </div>
              <textarea
                id="post-caption"
                name="caption"
                rows="3"
                maxLength={MAX_CAPTION}
                placeholder="Write a caption…"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="styled-textarea"
              />
            </div>

            <div className="form-submit-row">
              <Link to="/dashboard" className="btn-outline" style={{ textDecoration: 'none', marginRight: '0.75rem' }}>
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !imageFile}
                className="btn-primary"
                style={{ minWidth: '150px' }}
              >
                {loading ? (
                  <>
                    <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                    Uploading…
                  </>
                ) : (
                  'Share Post'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default PostUpload;
