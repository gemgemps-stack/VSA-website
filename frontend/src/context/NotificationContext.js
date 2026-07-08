import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import '../styles/Notification.css';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => removeNotification(id), 3500);
  }, [removeNotification]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const previousAlert = window.alert;
    window.alert = (message) => {
      addNotification(String(message), 'info');
    };

    return () => {
      window.alert = previousAlert;
    };
  }, [addNotification]);

  const value = useMemo(() => ({
    addNotification,
    notify: addNotification,
    success: (message) => addNotification(message, 'success'),
    error: (message) => addNotification(message, 'error'),
    info: (message) => addNotification(message, 'info')
  }), [addNotification]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="notification-stack" aria-live="polite" aria-atomic="true">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification-toast notification-${notification.type}`}
            role="status"
          >
            <span>{notification.message}</span>
            <button
              type="button"
              className="notification-close"
              onClick={() => removeNotification(notification.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }

  return context;
};
