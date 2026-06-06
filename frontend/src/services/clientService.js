import api from './api';

const clientService = {
  createClient: (clientData) => api.post('/clients', clientData),

  getAllClients: (page = 0, size = 10) => 
    api.get('/clients', { params: { page, size } }),

  getClientById: (id) => api.get(`/clients/${id}`),

  getVipClients: () => api.get('/clients/vip'),

  searchClients: (name) => api.get('/clients/search', { params: { name } }),

  updateClient: (id, clientData) => api.put(`/clients/${id}`, clientData),

  deleteClient: (id) => api.delete(`/clients/${id}`),
};

export default clientService;
