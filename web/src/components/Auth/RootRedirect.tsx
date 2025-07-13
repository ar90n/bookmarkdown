import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AppProvider';

export const RootRedirect: React.FC = () => {
  const auth = useAuthContext();

  // Redirect based on authentication status
  if (auth.isAuthenticated) {
    return <Navigate to="/bookmarks" replace />;
  } else {
    return <Navigate to="/welcome" replace />;
  }
};