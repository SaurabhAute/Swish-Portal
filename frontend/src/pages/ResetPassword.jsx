import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import SwishLogo from '../components/SwishLogo';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ResetPassword = () => {
  const { token: routeToken } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [token, setToken] = useState(routeToken || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Password reset token is required');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await authService.resetPassword(token.trim(), password);
      setSuccess(true);
      if (data.token) {
        localStorage.setItem('swish_token', data.token);
      }
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Left Branding */}
      <SwishLogo />

      {/* Right Content */}
      <div className="auth-content">
        <div className="mobile-logo">
          <div className="brand-logo">SWISH</div>
          <p>Connect. Create. Share.</p>
        </div>

        <div className="glass-card">
          <div className="card-header">
            <h2>Set New Password 🔒</h2>
            <p>Enter your new password below</p>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  background: 'rgba(52, 211, 153, 0.12)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  color: 'var(--success)',
                  marginBottom: '1rem',
                  fontSize: '0.95rem',
                }}
              >
                ✓ Password has been reset successfully! Redirecting to login...
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/login')}
                style={{ width: '100%' }}
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {!routeToken && (
                <AuthInput
                  id="token"
                  label="Reset Token"
                  type="text"
                  placeholder="Paste your reset token here"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setError('');
                  }}
                />
              )}

              <PasswordInput
                id="password"
                label="New Password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
              />

              <PasswordInput
                id="confirmPassword"
                label="Confirm New Password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
              />

              {error && <div className="error-banner">{error}</div>}

              <AuthButton type="submit" isLoading={loading}>
                Reset Password
              </AuthButton>
            </form>
          )}

          <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
            Remembered your password?{' '}
            <Link to="/login" className="auth-link">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
