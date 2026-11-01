import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const userInitial = user?.profile?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="profile-page-wrapper">
      <header className="profile-nav-header">
        <div className="nav-brand">
          <Link to="/dashboard" className="brand-logo-text">SWISH</Link>
          <span className="nav-badge">v1.0</span>
        </div>

        <nav className="nav-links">
          <Link to="/dashboard" className="nav-item nav-item-active">Dashboard</Link>
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
        {/* Welcome & Quick Profile Widget */}
        <div className="tab-pane-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div className="avatar-preview-box" style={{ width: '64px', height: '64px' }}>
                {user?.profile?.avatar ? (
                  <img src={user.profile.avatar} alt="Profile" className="avatar-preview-img" />
                ) : (
                  <div className="avatar-preview-fallback" style={{ fontSize: '1.5rem' }}>{userInitial}</div>
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h2 style={{ fontSize: '1.4rem' }}>
                    Hello, {user?.profile?.firstName ? user.profile.firstName : user?.email?.split('@')[0]}!
                  </h2>
                  <span className={`role-badge role-badge-${user?.role || 'user'}`}>
                    {user?.role}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                  {user?.profile?.bio || 'No bio set yet. Click below to customize your profile!'}
                </p>
              </div>
            </div>

            <Link to="/profile" className="btn-primary" style={{ textDecoration: 'none', padding: '0.6rem 1.25rem' }}>
              ✏️ Manage Profile
            </Link>
          </div>
        </div>

        {/* Info card */}
        <div className="tab-pane-card">
          <div className="pane-header">
            <h3>Active Session & Authenticated JWT Payload</h3>
            <p>Real-time authenticated state from MongoDB Atlas</p>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1.25rem', borderRadius: '10px', overflowX: 'auto', border: '1px solid var(--border)' }}>
            <pre style={{ fontSize: '0.85rem', color: '#a78bfa' }}>
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
