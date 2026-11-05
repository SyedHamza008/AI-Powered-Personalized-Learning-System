import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children, allowedRoles, requireOnboarded = null }) => {
  const { currentUser, onboarded, loading, authChecked } = useAuth();

  if (loading || !authChecked) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  // User must NOT be onboarded yet → force to onboard page
  if (requireOnboarded === false && onboarded) {
    return <Navigate to={`/${currentUser.role}`} replace />;
  }
  if (requireOnboarded === true && !onboarded) {
    return <Navigate to={`/onboard/${currentUser.role}`} replace />;
  }

  return children;
};

export default PrivateRoute;
