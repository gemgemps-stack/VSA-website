import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const hasStoredSession = authService.isAuthenticated();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!isAuthenticated && !hasStoredSession) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
