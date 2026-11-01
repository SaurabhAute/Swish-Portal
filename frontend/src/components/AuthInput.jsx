import React from 'react';

const AuthInput = ({ label, id, type = 'text', placeholder, value, onChange, error, ...props }) => {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrapper">
        <input
          id={id}
          type={type}
          className="auth-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...props}
        />
      </div>
      {error && <div className="auth-error">{error}</div>}
    </div>
  );
};

export default AuthInput;
