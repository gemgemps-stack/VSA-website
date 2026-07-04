import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import authService from '../services/authService';
import { hasPermission } from '../utils/permissions';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!authService.getCurrentUser());
  const authSequenceRef = useRef(0);

  useEffect(() => {
    const handleAuthLogout = () => {
      authSequenceRef.current += 1;
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    };

    window.addEventListener('auth:logout', handleAuthLogout);

    const bootstrap = async () => {
      const sequence = ++authSequenceRef.current;

      try {
        void authService.refreshCsrfToken().catch((error) => {
          console.warn('Unable to refresh CSRF token during auth bootstrap:', error);
        });

        authService.refreshCurrentUser()
          .then((currentUser) => {
            if (sequence !== authSequenceRef.current) {
              return;
            }
            setUser(currentUser);
            setIsAuthenticated(!!currentUser);
          })
          .catch((error) => {
            if (sequence !== authSequenceRef.current) {
              return;
            }
            if (error.response?.status === 401) {
              setUser(null);
              setIsAuthenticated(false);
            } else {
              console.warn('Auth bootstrap could not restore the current user:', error);
            }
          });
      } catch (error) {
        if (sequence !== authSequenceRef.current) {
          return;
        }
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    bootstrap();

    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    await authService.refreshCsrfToken().catch((error) => {
      console.warn('Unable to refresh CSRF token after login:', error);
    });
    authSequenceRef.current += 1;
    const nextUser = response.user || authService.getCurrentUser();
    setUser(nextUser);
    setIsAuthenticated(!!nextUser);
    setLoading(false);
    return response;
  };

  const logout = async () => {
    await authService.logout();
    await authService.refreshCsrfToken().catch((error) => {
      console.warn('Unable to refresh CSRF token after logout:', error);
    });
    authSequenceRef.current += 1;
    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
  };

  const canAccess = (permission) => {
    if (!user) return false;
    return hasPermission(user.permissions, permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
