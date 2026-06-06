import api from './api';

const incomeService = {
  createIncomeSource: (incomeData) => api.post('/api/income', incomeData),

  getAllIncomeSources: (page = 0, size = 10) => 
    api.get('/api/income', { params: { page, size } }),

  getIncomeSourceById: (id) => api.get(`/api/income/${id}`),

  getIncomeSourceByDate: (date) => 
    api.get(`/api/income/date/${date}`),

  getIncomeSourcesByDateRange: (startDate, endDate) => 
    api.get('/api/income/date-range', { params: { startDate, endDate } }),

  updateIncomeSource: (id, incomeData) => api.put(`/api/income/${id}`, incomeData),

  deleteIncomeSource: (id) => api.delete(`/api/income/${id}`),
};

export default incomeService;
