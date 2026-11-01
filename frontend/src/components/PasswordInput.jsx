import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordInput = ({ label, id, placeholder, value, onChange, error, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrapper">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          className="auth-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{ paddingRight: '2.5rem' }}
          {...props}
        />
        <button
          type="button"
          className="input-icon-btn"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <div className="auth-error">{error}</div>}
    </div>
  );
};

export default PasswordInput;
