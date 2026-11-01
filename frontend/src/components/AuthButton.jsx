import React from 'react';
import { Loader2 } from 'lucide-react';

const AuthButton = ({ children, isLoading, ...props }) => {
  return (
    <button className="btn-primary" disabled={isLoading} {...props}>
      {isLoading ? (
        <>
          <Loader2 className="spinner" size={18} />
          Please wait...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default AuthButton;
