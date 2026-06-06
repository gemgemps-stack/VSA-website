import api from './api';

const inventoryService = {
  createInventory: (inventoryData) => api.post('/inventory', inventoryData),

  getAllInventory: (page = 0, size = 10) => 
    api.get('/inventory', { params: { page, size } }),

  getInventoryById: (id) => api.get(`/inventory/${id}`),

  getInventoryByJerseyType: (jerseyType) => 
    api.get(`/inventory/type/${jerseyType}`),

  searchInventory: (name) => api.get('/inventory/search', { params: { name } }),

  getLowStockInventory: (threshold = 10) => 
    api.get(`/inventory/low-stock/${threshold}`),

  updateInventory: (id, inventoryData) => api.put(`/inventory/${id}`, inventoryData),

  deleteInventory: (id) => api.delete(`/inventory/${id}`),
};

export default inventoryService;
