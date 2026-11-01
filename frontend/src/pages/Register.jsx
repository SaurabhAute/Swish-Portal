import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthInput from '../components/AuthInput';
import PasswordInput from '../components/PasswordInput';
import AuthButton from '../components/AuthButton';
import SwishLogo from '../components/SwishLogo';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({ 
    firstName: '',
    lastName: '',
    email: '', 
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    setError('');
  };

  const setRole = (role) => {
    setFormData({ ...formData, role });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      role: formData.role
    };

    const result = await register(payload);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="auth-layout">
      {/* Left Branding — Desktop only */}
      <SwishLogo />

      {/* Right Auth Content */}
      <div className="auth-content">
        {/* Mobile logo */}
        <div className="mobile-logo">
          <div className="brand-logo">SWISH</div>
          <p>Connect. Create. Share.</p>
        </div>

        <div className="glass-card">
          <div className="card-header">
            <h2>Create your account ✨</h2>
            <p>Join Swish and start sharing.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="name-row">
              <AuthInput
                id="firstName"
                label="First Name"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleChange}
              />
              <AuthInput
                id="lastName"
                label="Last Name"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>

            <AuthInput
              id="email"
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />

            <PasswordInput
              id="password"
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />

            <div className="role-selector">
              <label>Select Role</label>
              <div className="role-toggle">
                <button 
                  type="button" 
                  className={`role-option ${formData.role === 'user' ? 'role-active' : ''}`}
                  onClick={() => setRole('user')}
                >
                  User <span className="role-badge role-badge-user">Default</span>
                </button>
                <button 
                  type="button" 
                  className={`role-option ${formData.role === 'admin' ? 'role-active' : ''}`}
                  onClick={() => setRole('admin')}
                >
                  Admin <span className="role-badge role-badge-admin">Creator</span>
                </button>
              </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <AuthButton type="submit" isLoading={loading}>
              Create Account
            </AuthButton>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
          </div>
          
          <div className="terms-text">
            By continuing, you agree to the Terms &amp; Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
