import api from './api';

const teamService = {
  getAllTeams: () => api.get('/api/teams'),
  getTeamById: (id) => api.get(`/api/teams/${id}`),
  createTeam: (teamData) => api.post('/api/teams', teamData),
  updateTeam: (id, teamData) => api.put(`/api/teams/${id}`, teamData),
  deleteTeam: (id) => api.delete(`/api/teams/${id}`),
};

export default teamService;
