import api from './api';

const orderService = {
  createOrder: (orderData) => api.post('/api/orders', orderData),

  getAllOrders: (page = 0, size = 10) => 
    api.get('/api/orders', { params: { page, size } }),

  getOrderById: (id) => api.get(`/api/orders/${id}`),

  getOrderByJobOrderNo: (jobOrderNo) => 
    api.get(`/api/orders/job-order-no/${jobOrderNo}`),

  getOrdersByClientId: (clientId) => 
    api.get(`/api/orders/client/${clientId}`),

  getOrdersByDateRange: (startDate, endDate) => 
    api.get('/api/orders/date-range', { params: { startDate, endDate } }),

  getOrdersByYearAndMonth: (year, month) => 
    api.get('/api/orders/year-month', { params: { year, month } }),

  getOrdersByStatus: (status, page = 0, size = 100) =>
    api.get('/api/orders/status', { params: { status, page, size } }),

  updateOrder: (id, orderData) => api.put(`/api/orders/${id}`, orderData),

  applyPaymentUpdate: (id, paymentData) => api.post(`/api/orders/${id}/payment-update`, paymentData),

  deleteOrder: (id) => api.delete(`/api/orders/${id}`),
};

export default orderService;
