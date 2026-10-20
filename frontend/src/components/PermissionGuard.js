import React from 'react';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';

const PermissionGuard = ({ permission, permissions, children, fallback = null }) => {
  const { user } = useAuth();

  if (!user) {
    return fallback;
  }

  const requested = permissions && permissions.length > 0 ? permissions : [permission];
  const hasAccess = requested.some((item) => hasPermission(user.permissions, item));

  if (!hasAccess) {
    return (
      fallback || (
        <div className="access-denied" role="alert">
          <span className="access-denied-kicker">Access restricted</span>
          <strong>You do not have permission to view this area.</strong>
          <p>Ask an administrator to enable access for {requested.join(' or ')}.</p>
        </div>
      )
    );
  }

  return children;
};

export default PermissionGuard;
