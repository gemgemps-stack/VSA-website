import api from './api';
import { hasPermission } from '../utils/permissions';
import { readAccessToken, writeAccessToken } from './authTokenStorage';

const CURRENT_USER_STORAGE_KEY = 'verdida:currentUser';
let currentUser = null;

const readStoredCurrentUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const serialized = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    return serialized ? JSON.parse(serialized) : null;
  } catch (error) {
    return null;
  }
};

const writeStoredCurrentUser = (user) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (user) {
      window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  } catch (error) {
    // Ignore storage failures so auth still works in restricted browsers.
  }
};

currentUser = readStoredCurrentUser();

const authService = {
  refreshCsrfToken: async () => {
    const response = await api.get('/api/auth/csrf');
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    currentUser = response.data.user || null;
    writeAccessToken(response.data.accessToken || null);
    writeStoredCurrentUser(currentUser);
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
      writeAccessToken(null);
      writeStoredCurrentUser(null);
      window.dispatchEvent(new Event('auth:logout'));
    }
  },

  refreshCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      currentUser = response.data || null;
      writeStoredCurrentUser(currentUser);
      return currentUser;
    } catch (error) {
      if (error.response?.status === 401) {
        currentUser = null;
        writeStoredCurrentUser(null);
      }
      throw error;
    }
  },

  getCurrentUser: () => currentUser,

  getAccessToken: () => readAccessToken(),

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
