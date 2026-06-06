import api from './api';

const userService = {
  createUser: (userData) => api.post('/api/users', userData),

  getAllUsers: (page = 0, size = 10) => 
    api.get('/api/users', { params: { page, size } }),

  getUserById: (id) => api.get(`/api/users/${id}`),

  getUserByUsername: (username) => api.get(`/api/users/username/${username}`),

  updateUser: (id, userData) => api.put(`/api/users/${id}`, userData),

  deleteUser: (id) => api.delete(`/api/users/${id}`),

  grantPermission: (userId, pageName) => 
    api.post(`/api/permissions/grant/${userId}/${pageName}`),

  revokePermission: (userId, pageName) => 
    api.delete(`/api/permissions/revoke/${userId}/${pageName}`),

  getUserPermissions: (userId) => api.get(`/api/permissions/${userId}`),

  hasPermission: (userId, pageName) => 
    api.get(`/api/permissions/${userId}/${pageName}`),
};

export default userService;
