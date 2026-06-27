import api from './api';

const customizedOrderService = {
  createOrder: (orderData) => api.post('/api/customized-orders', orderData),

  getAllOrders: (page = 0, size = 10) =>
    api.get('/api/customized-orders', { params: { page, size } }),

  getOrderById: (id) => api.get(`/api/customized-orders/${id}`),

  getOrderByJobOrderNo: (jobOrderNo) =>
    api.get(`/api/customized-orders/job-order-no/${jobOrderNo}`),

  getOrdersByClientId: (clientId) =>
    api.get(`/api/customized-orders/client/${clientId}`),

  getOrdersByDateRange: (startDate, endDate) =>
    api.get('/api/customized-orders/date-range', { params: { startDate, endDate } }),

  getOrdersByYearAndMonth: (year, month) =>
    api.get('/api/customized-orders/year-month', { params: { year, month } }),

  getOrdersByStatus: (status, page = 0, size = 100) =>
    api.get('/api/customized-orders/status', { params: { status, page, size } }),

  updateOrder: (id, orderData) => api.put(`/api/customized-orders/${id}`, orderData),

  applyPaymentUpdate: (id, paymentData) => api.post(`/api/customized-orders/${id}/payment-update`, paymentData),

  deleteOrder: (id) => api.delete(`/api/customized-orders/${id}`),
};

export default customizedOrderService;
