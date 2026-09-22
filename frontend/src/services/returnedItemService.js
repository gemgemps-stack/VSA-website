import api from './api';

const returnedItemService = {
  createReturnedItem: (data) => api.post('/api/returned-items', data),

  getAllReturnedItems: (page = 0, size = 100) =>
    api.get('/api/returned-items', { params: { page, size } }),

  getReturnedItemById: (id) => api.get(`/api/returned-items/${id}`),

  getReturnedItemsByOrderId: (orderId) =>
    api.get(`/api/returned-items/by-order/${orderId}`),

  getReturnedItemsByCustomizedOrderId: (customizedOrderId) =>
    api.get(`/api/returned-items/by-customized-order/${customizedOrderId}`),

  updateReturnedItem: (id, data) => api.put(`/api/returned-items/${id}`, data),

  deleteReturnedItem: (id) => api.delete(`/api/returned-items/${id}`),
};

export default returnedItemService;