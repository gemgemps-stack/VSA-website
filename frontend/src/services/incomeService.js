import api from './api';

const incomeService = {
  createIncomeSource: (incomeData) => api.post('/income', incomeData),

  getAllIncomeSources: (page = 0, size = 10) => 
    api.get('/income', { params: { page, size } }),

  getIncomeSourceById: (id) => api.get(`/income/${id}`),

  getIncomeSourceByDate: (date) => 
    api.get(`/income/date/${date}`),

  getIncomeSourcesByDateRange: (startDate, endDate) => 
    api.get('/income/date-range', { params: { startDate, endDate } }),

  updateIncomeSource: (id, incomeData) => api.put(`/income/${id}`, incomeData),

  deleteIncomeSource: (id) => api.delete(`/income/${id}`),
};

export default incomeService;
