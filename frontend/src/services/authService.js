import api from './api';

const authService = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken: () => {
    return localStorage.getItem('accessToken');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  },

  hasRole: (role) => {
    const user = authService.getCurrentUser();
    return user && user.role === role;
  },

  hasPermission: (permission) => {
    const user = authService.getCurrentUser();
    return user?.permissions?.some(p => p.pageName === permission);
  },

  canAccess: (permission) => {
    return authService.hasRole('ADMIN') || authService.hasPermission(permission);
  },
};

export default authService;
