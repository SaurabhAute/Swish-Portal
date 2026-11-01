import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'danger'
  
  // Profile form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    phone: '',
    avatar: '',
  });

  // Password change form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & loading states
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Sync form data with current user
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        bio: user.profile?.bio || '',
        phone: user.profile?.phone || '',
        avatar: user.profile?.avatar || '',
      });
    }
  }, [user]);

  // Handle text inputs
  const handleProfileChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (profileMsg.text) setProfileMsg({ type: '', text: '' });
  };

  // Handle avatar upload via file reader
  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Image size should be under 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({ ...prev, avatar: '' }));
  };

  // Submit profile updates (FR-02)
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });

    try {
      const response = await userService.updateProfile(formData);
      updateUser(response.user);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Submit password change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setPasswordMsg({ type: 'error', text: 'Please fill in both current and new passwords' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMsg({ type: '', text: '' });

    try {
      await userService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to change password',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await userService.deleteAccount();
      logout();
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete account');
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  // Calculate password strength
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, text: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, text: 'Weak', color: '#f87171' };
    if (score <= 4) return { score: 2, text: 'Medium', color: '#fbbf24' };
    return { score: 3, text: 'Strong', color: '#34d399' };
  };

  const strength = getPasswordStrength(passwordData.newPassword);

  const userInitial = user?.profile?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="profile-page-wrapper">
      {/* Navigation Header */}
      <header className="profile-nav-header">
        <div className="nav-brand">
          <Link to="/dashboard" className="brand-logo-text">SWISH</Link>
          <span className="nav-badge">v1.0</span>
        </div>

        <nav className="nav-links">
          <Link to="/dashboard" className="nav-item">Dashboard</Link>
          <Link to="/profile" className="nav-item nav-item-active">Profile</Link>
        </nav>

        <div className="nav-user-actions">
          <div className="nav-user-info">
            {user?.profile?.avatar ? (
              <img src={user.profile.avatar} alt="Avatar" className="nav-avatar-img" />
            ) : (
              <div className="nav-avatar-fallback">{userInitial}</div>
            )}
            <span className="nav-username">
              {user?.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}` : user?.email}
            </span>
          </div>
          <button onClick={logout} className="btn-outline btn-logout">Logout</button>
        </div>
      </header>

      <main className="profile-main-container">
        {/* Hero Profile Banner */}
        <div className="profile-hero-card">
          <div className="hero-cover-bg"></div>
          <div className="hero-content">
            <div className="hero-avatar-container">
              {formData.avatar ? (
                <img src={formData.avatar} alt="Profile" className="hero-avatar-img" />
              ) : (
                <div className="hero-avatar-placeholder">{userInitial}</div>
              )}
            </div>

            <div className="hero-user-details">
              <div className="hero-name-row">
                <h2>
                  {formData.firstName || formData.lastName
                    ? `${formData.firstName} ${formData.lastName}`
                    : user?.email?.split('@')[0]}
                </h2>
                <span className={`role-badge role-badge-${user?.role || 'user'}`}>
                  {user?.role?.toUpperCase()}
                </span>
              </div>
              <p className="hero-email">{user?.email}</p>
              {formData.bio && <p className="hero-bio">“{formData.bio}”</p>}
              
              <div className="hero-meta-row">
                {formData.phone && (
                  <span className="meta-tag">
                    📞 {formData.phone}
                  </span>
                )}
                <span className="meta-tag">
                  📅 Joined {new Date(user?.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="profile-tabs">
            <button
              className={`tab-btn ${activeTab === 'profile' ? 'tab-btn-active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              👤 Edit Profile
            </button>
            <button
              className={`tab-btn ${activeTab === 'security' ? 'tab-btn-active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              🔒 Security & Password
            </button>
            <button
              className={`tab-btn ${activeTab === 'danger' ? 'tab-btn-active' : ''}`}
              onClick={() => setActiveTab('danger')}
            >
              ⚠️ Account Settings
            </button>
          </div>
        </div>

        {/* Tab 1: Edit Profile (FR-02) */}
        {activeTab === 'profile' && (
          <div className="tab-pane-card">
            <div className="pane-header">
              <h3>Edit Personal Information</h3>
              <p>Update your photo, bio, and personal details</p>
            </div>

            {profileMsg.text && (
              <div className={`notification-banner ${profileMsg.type === 'success' ? 'notif-success' : 'notif-error'}`}>
                {profileMsg.type === 'success' ? '✓ ' : '⚠️ '}
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleProfileSubmit}>
              {/* Photo Upload Section */}
              <div className="avatar-edit-section">
                <label className="section-label">Profile Photo</label>
                <div className="avatar-uploader-row">
                  <div className="avatar-preview-box">
                    {formData.avatar ? (
                      <img src={formData.avatar} alt="Preview" className="avatar-preview-img" />
                    ) : (
                      <div className="avatar-preview-fallback">{userInitial}</div>
                    )}
                  </div>

                  <div className="avatar-actions">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarFile}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-outline"
                      >
                        📷 Upload Photo
                      </button>
                      {formData.avatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="btn-outline btn-remove-photo"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <span className="field-hint">Supports PNG, JPG, GIF up to 2MB</span>
                  </div>
                </div>

                <div className="url-avatar-input" style={{ marginTop: '1rem' }}>
                  <label className="field-sublabel">Or enter photo URL</label>
                  <input
                    type="url"
                    name="avatar"
                    placeholder="https://example.com/my-photo.jpg"
                    value={formData.avatar}
                    onChange={handleProfileChange}
                    className="styled-text-input"
                  />
                </div>
              </div>

              {/* Basic Info Fields */}
              <div className="form-grid-2">
                <div className="input-field-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="e.g. John"
                    value={formData.firstName}
                    onChange={handleProfileChange}
                    className="styled-text-input"
                  />
                </div>
                <div className="input-field-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="e.g. Doe"
                    value={formData.lastName}
                    onChange={handleProfileChange}
                    className="styled-text-input"
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={handleProfileChange}
                  className="styled-text-input"
                />
              </div>

              {/* Bio Field */}
              <div className="input-field-group">
                <div className="field-label-row">
                  <label>Bio</label>
                  <span className="char-count">{formData.bio.length}/500</span>
                </div>
                <textarea
                  name="bio"
                  rows="4"
                  maxLength="500"
                  placeholder="Tell the world about yourself..."
                  value={formData.bio}
                  onChange={handleProfileChange}
                  className="styled-textarea"
                />
              </div>

              <div className="form-submit-row">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="btn-primary"
                  style={{ minWidth: '150px' }}
                >
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === 'security' && (
          <div className="tab-pane-card">
            <div className="pane-header">
              <h3>Change Password</h3>
              <p>Ensure your account is using a secure password</p>
            </div>

            {passwordMsg.text && (
              <div className={`notification-banner ${passwordMsg.type === 'success' ? 'notif-success' : 'notif-error'}`}>
                {passwordMsg.type === 'success' ? '✓ ' : '⚠️ '}
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit}>
              <div className="input-field-group">
                <label>Current Password</label>
                <div className="password-input-box">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="styled-text-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="btn-eye"
                  >
                    {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="input-field-group">
                <label>New Password</label>
                <div className="password-input-box">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="styled-text-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="btn-eye"
                  >
                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>

                {passwordData.newPassword && (
                  <div className="password-strength-box">
                    <div className="strength-bar-bg">
                      <div
                        className="strength-bar-fill"
                        style={{
                          width: `${(strength.score / 3) * 100}%`,
                          backgroundColor: strength.color,
                        }}
                      ></div>
                    </div>
                    <span style={{ color: strength.color, fontSize: '0.8rem', fontWeight: 500 }}>
                      Strength: {strength.text}
                    </span>
                  </div>
                )}
              </div>

              <div className="input-field-group">
                <label>Confirm New Password</label>
                <div className="password-input-box">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="styled-text-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="btn-eye"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-submit-row">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="btn-primary"
                  style={{ minWidth: '160px' }}
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Account Settings & Danger Zone */}
        {activeTab === 'danger' && (
          <div className="tab-pane-card">
            <div className="pane-header">
              <h3>Account Management</h3>
              <p>Account identity and critical actions</p>
            </div>

            <div className="account-details-grid">
              <div className="account-detail-item">
                <span className="detail-label">Account ID</span>
                <span className="detail-value mono-text">{user?._id || user?.id}</span>
              </div>
              <div className="account-detail-item">
                <span className="detail-label">Email</span>
                <span className="detail-value">{user?.email}</span>
              </div>
              <div className="account-detail-item">
                <span className="detail-label">Assigned Role</span>
                <span className="detail-value">
                  <span className={`role-badge role-badge-${user?.role || 'user'}`}>
                    {user?.role}
                  </span>
                </span>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="danger-zone-card">
              <div className="danger-zone-info">
                <h4>Delete Account</h4>
                <p>
                  Permanently delete your profile and all associated data. This action cannot be reversed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn-danger"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <h3>Are you absolutely sure?</h3>
            <p>
              This will permanently delete the account <strong>{user?.email}</strong> and all profile data.
              You will not be able to recover this account.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn-outline"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="btn-danger"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
