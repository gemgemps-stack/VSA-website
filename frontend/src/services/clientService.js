import api from './api';

const clientService = {
  createClient: (clientData) => api.post('/api/clients', clientData),

  getAllClients: (page = 0, size = 10) => 
    api.get('/api/clients', { params: { page, size } }),

  getClientById: (id) => api.get(`/api/clients/${id}`),

  getVipClients: () => api.get('/api/clients/vip'),

  searchClients: (name) => api.get('/api/clients/search', { params: { name } }),

  updateClient: (id, clientData) => api.put(`/api/clients/${id}`, clientData),

  deleteClient: (id) => api.delete(`/api/clients/${id}`),
};

export default clientService;
