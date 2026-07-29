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
    return (
      fallback || (
        <div className="access-denied" role="alert">
          <span className="access-denied-kicker">Access restricted</span>
          <strong>You do not have permission to view this area.</strong>
          <p>Ask an administrator to enable access for {permission}.</p>
        </div>
      )
    );
  }

  return children;
};

export default PermissionGuard;
