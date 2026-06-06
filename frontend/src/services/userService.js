import api from './api';

const userService = {
  createUser: (userData) => api.post('/users', userData),

  getAllUsers: (page = 0, size = 10) => 
    api.get('/users', { params: { page, size } }),

  getUserById: (id) => api.get(`/users/${id}`),

  getUserByUsername: (username) => api.get(`/users/username/${username}`),

  updateUser: (id, userData) => api.put(`/users/${id}`, userData),

  deleteUser: (id) => api.delete(`/users/${id}`),

  grantPermission: (userId, pageName) => 
    api.post(`/permissions/grant/${userId}/${pageName}`),

  revokePermission: (userId, pageName) => 
    api.delete(`/permissions/revoke/${userId}/${pageName}`),

  getUserPermissions: (userId) => api.get(`/permissions/${userId}`),

  hasPermission: (userId, pageName) => 
    api.get(`/permissions/${userId}/${pageName}`),
};

export default userService;
