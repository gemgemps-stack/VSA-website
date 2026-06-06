import api from './api';

const inventoryService = {
  createInventory: (inventoryData) => api.post('/api/inventory', inventoryData),

  getAllInventory: (page = 0, size = 10) => 
    api.get('/api/inventory', { params: { page, size } }),

  getInventoryById: (id) => api.get(`/api/inventory/${id}`),

  getInventoryByJerseyType: (jerseyType) => 
    api.get(`/api/inventory/type/${jerseyType}`),

  searchInventory: (name) => api.get('/api/inventory/search', { params: { name } }),

  getLowStockInventory: (threshold = 10) => 
    api.get(`/api/inventory/low-stock/${threshold}`),

  updateInventory: (id, inventoryData) => api.put(`/api/inventory/${id}`, inventoryData),

  deleteInventory: (id) => api.delete(`/api/inventory/${id}`),
};

export default inventoryService;
