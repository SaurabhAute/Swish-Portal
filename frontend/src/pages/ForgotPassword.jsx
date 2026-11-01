import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthInput from '../components/AuthInput';
import AuthButton from '../components/AuthButton';
import SwishLogo from '../components/SwishLogo';
import { authService } from '../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await authService.forgotPassword(email);
      setSuccessData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (successData?.resetToken) {
      navigator.clipboard.writeText(successData.resetToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            <h2>Reset Password 🔑</h2>
            <p>Enter your email to receive a password reset token</p>
          </div>

          {!successData ? (
            <form onSubmit={handleSubmit}>
              <AuthInput
                id="email"
                label="Registered Email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
              />

              {error && <div className="error-banner">{error}</div>}

              <AuthButton type="submit" isLoading={loading}>
                Send Reset Token
              </AuthButton>
            </form>
          ) : (
            <div className="reset-success-box" style={{ marginTop: '1rem' }}>
              <div
                style={{
                  background: 'rgba(52, 211, 153, 0.12)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  padding: '1rem',
                  borderRadius: '10px',
                  marginBottom: '1.25rem',
                  color: 'var(--success)',
                  fontSize: '0.9rem',
                }}
              >
                ✓ Reset token generated successfully!
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                For development and testing, here is your generated token:
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.8rem',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  wordBreak: 'break-all',
                  marginBottom: '1rem',
                  gap: '0.5rem',
                }}
              >
                <span style={{ flex: 1 }}>{successData.resetToken}</span>
                <button
                  type="button"
                  onClick={copyToken}
                  className="btn-outline"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate(`/reset-password/${successData.resetToken}`)}
                style={{ width: '100%', marginBottom: '1rem' }}
              >
                Proceed to Reset Password →
              </button>
            </div>
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

export default ForgotPassword;
