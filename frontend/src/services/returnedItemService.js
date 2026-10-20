import api from './api';
import { buildSortAwareSerializer, splitSortParam } from '../utils/sortParams';

const returnedItemService = {
  createReturnedItem: (data) => api.post('/api/returned-items', data),

  createReturnedItemsBulk: (items) => api.post('/api/returned-items/bulk', items),

  getAllReturnedItems: (page = 0, size = 50, filters = {}) => {
    const { sort, ...rest } = filters;
    return api.get('/api/returned-items', {
      params: { page, size, ...rest },
      paramsSerializer: buildSortAwareSerializer(splitSortParam(sort)),
    });
  },

  getReturnedItemById: (id) => api.get(`/api/returned-items/${id}`),

  getReturnedItemsByOrderId: (orderId) =>
    api.get(`/api/returned-items/by-order/${orderId}`),

  getReturnedItemsByCustomizedOrderId: (customizedOrderId) =>
    api.get(`/api/returned-items/by-customized-order/${customizedOrderId}`),

  updateReturnedItem: (id, data) => api.put(`/api/returned-items/${id}`, data),

  deleteReturnedItem: (id) => api.delete(`/api/returned-items/${id}`),
};

export default returnedItemService;
