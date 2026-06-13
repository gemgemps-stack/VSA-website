import React from 'react';
import { useAuth } from '../context/AuthContext';

const normalizePermission = (value) => String(value || '').trim().toUpperCase();

const PermissionGuard = ({ permission, children, fallback = null }) => {
  const { user } = useAuth();

  if (!user) {
    return fallback;
  }

  const hasAccess =
    user.role === 'ADMIN' ||
    user.permissions?.some((p) => normalizePermission(p.pageName) === normalizePermission(permission));

  if (!hasAccess) {
    return fallback || <div className="access-denied">Access Denied</div>;
  }

  return children;
};

export default PermissionGuard;
