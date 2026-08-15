import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, homePathForRole } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/common/Loaders';

export const ProtectedRoute = ({ roles, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader label="Verifying session…" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathForRole(user.role)} replace />;
  return children;
};
