import api from './api';

const attendanceService = {
  createAttendance: (attendanceData) => api.post('/api/attendance', attendanceData),

  getAllAttendance: (page = 0, size = 10) =>
    api.get('/api/attendance', { params: { page, size } }),

  getAttendanceById: (id) => api.get(`/api/attendance/${id}`),

  getAttendanceByDateRange: (startDate, endDate) =>
    api.get('/api/attendance/date-range', { params: { startDate, endDate } }),

  getAttendanceByMonth: (year, month) =>
    api.get('/api/attendance/month', { params: { year, month } }),

  updateAttendance: (id, attendanceData) => api.put(`/api/attendance/${id}`, attendanceData),

  deleteAttendance: (id) => api.delete(`/api/attendance/${id}`),
};

export default attendanceService;
