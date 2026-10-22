import api from './api';
import { hasPermission } from '../utils/permissions';
import { readAccessToken, writeAccessToken } from './authTokenStorage';

const CURRENT_USER_STORAGE_KEY = 'verdida:currentUser';
const STORED_ACCOUNTS_KEY = 'verdida:accounts';
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

const readStoredAccounts = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const serialized = window.localStorage.getItem(STORED_ACCOUNTS_KEY);
    return serialized ? JSON.parse(serialized) : {};
  } catch (error) {
    return {};
  }
};

const writeStoredAccounts = (accounts) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (accounts && Object.keys(accounts).length > 0) {
      window.localStorage.setItem(STORED_ACCOUNTS_KEY, JSON.stringify(accounts));
    } else {
      window.localStorage.removeItem(STORED_ACCOUNTS_KEY);
    }
  } catch (error) {
    // Ignore storage failures so auth still works in restricted browsers.
  }
};

const addStoredAccount = (email, user, token) => {
  const accounts = readStoredAccounts();
  accounts[email] = { email, user, token };
  writeStoredAccounts(accounts);
};

const removeStoredAccount = (email) => {
  const accounts = readStoredAccounts();
  delete accounts[email];
  writeStoredAccounts(accounts);
};

const switchAccount = async (email) => {
  const accounts = readStoredAccounts();
  const account = accounts[email];

  if (!account) {
    throw new Error('Stored account not found.');
  }

  currentUser = account.user;
  writeAccessToken(account.token);
  writeStoredCurrentUser(account.user);

  await authService.refreshCsrfToken().catch((error) => {
    console.warn('Unable to refresh CSRF token after switching account:', error);
  });

  return account.user;
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
    addStoredAccount(email, currentUser, response.data.accessToken || null);
    await authService.refreshCsrfToken().catch((error) => {
      console.warn('Unable to refresh CSRF token after login:', error);
    });
    return response.data;
  },

  getStoredAccounts: () => readStoredAccounts(),

  switchAccount,

  removeStoredAccount,

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
        writeAccessToken(null);
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
