import api from './api';

const orderService = {
  createOrder: (orderData) => api.post('/orders', orderData),

  getAllOrders: (page = 0, size = 10) => 
    api.get('/orders', { params: { page, size } }),

  getOrderById: (id) => api.get(`/orders/${id}`),

  getOrderByJobOrderNo: (jobOrderNo) => 
    api.get(`/orders/job-order-no/${jobOrderNo}`),

  getOrdersByClientId: (clientId) => 
    api.get(`/orders/client/${clientId}`),

  getOrdersByDateRange: (startDate, endDate) => 
    api.get('/orders/date-range', { params: { startDate, endDate } }),

  getOrdersByYearAndMonth: (year, month) => 
    api.get('/orders/year-month', { params: { year, month } }),

  updateOrder: (id, orderData) => api.put(`/orders/${id}`, orderData),

  deleteOrder: (id) => api.delete(`/orders/${id}`),
};

export default orderService;
