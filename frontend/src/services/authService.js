import api from './api';
import { hasPermission } from '../utils/permissions';

let currentUser = null;

const authService = {
  refreshCsrfToken: async () => {
    const response = await api.get('/api/auth/csrf');
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    currentUser = response.data.user || null;
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      // Logout should still succeed locally even if the backend is unreachable.
      console.warn('Logout request failed, continuing with local sign-out:', error);
    } finally {
      currentUser = null;
      window.dispatchEvent(new Event('auth:logout'));
    }
  },

  refreshCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      currentUser = response.data || null;
      return currentUser;
    } catch (error) {
      currentUser = null;
      throw error;
    }
  },

  getCurrentUser: () => currentUser,

  hasRole: (role) => {
    return currentUser && currentUser.role === role;
  },

  hasPermission: (permission) => {
    return hasPermission(currentUser?.permissions, permission);
  },

  canAccess: (permission) => {
    return authService.hasPermission(permission);
  },
};

export default authService;
