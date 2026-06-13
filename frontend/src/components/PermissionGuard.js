import React from 'react';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';

const PermissionGuard = ({ permission, children, fallback = null }) => {
  const { user } = useAuth();

  if (!user) {
    return fallback;
  }

  const hasAccess = hasPermission(user.permissions, permission);

  if (!hasAccess) {
    return fallback || <div className="access-denied">Access Denied</div>;
  }

  return children;
};

export default PermissionGuard;
