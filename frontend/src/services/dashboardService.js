import api from './api';

const dashboardService = {
  getStats: () => api.get('/api/dashboard/stats'),
};

export default dashboardService;
