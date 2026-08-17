import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const TOKEN_KEY = 'cp_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const unwrap = (p) => p.then((r) => r.data);

export const authApi = {
  login: (body) => unwrap(api.post('/auth/login', body)),
  register: (body) => unwrap(api.post('/auth/register', body)),
  me: () => unwrap(api.get('/auth/me')),
};

export const metaApi = {
  meta: () => unwrap(api.get('/meta')),
  departments: () => unwrap(api.get('/departments')),
};

export const complaintApi = {
  analyze: (body) => unwrap(api.post('/ai/analyze', body)),
  create: (body) => unwrap(api.post('/complaints', body)),
  list: (params) => unwrap(api.get('/complaints', { params })),
  nearby: () => unwrap(api.get('/complaints/nearby')),
  get: (id) => unwrap(api.get(`/complaints/${id}`)),
  assign: (id, body) => unwrap(api.patch(`/complaints/${id}/assign`, body)),
  status: (id, body) => unwrap(api.patch(`/complaints/${id}/status`, body)),
  resolution: (id, body) => unwrap(api.post(`/complaints/${id}/resolution`, body)),
  verify: (id, body) => unwrap(api.post(`/complaints/${id}/verify`, body)),
  feedback: (id, body) => unwrap(api.post(`/complaints/${id}/feedback`, body)),
  support: (id) => unwrap(api.post(`/complaints/${id}/support`)),
};

export const notificationApi = {
  list: () => unwrap(api.get('/notifications')),
  read: (id) => unwrap(api.post(`/notifications/${id}/read`)),
  readAll: () => unwrap(api.post('/notifications/read-all')),
};

export const analyticsApi = {
  overview: (params) => unwrap(api.get('/analytics/overview', { params })),
  departmentPerformance: () => unwrap(api.get('/analytics/department-performance')),
  mapPoints: () => unwrap(api.get('/map/points')),
  incidents: () => unwrap(api.get('/incidents')),
  citySignals: () => unwrap(api.get('/city-signals')),
};

export const dataApi = {
  sources: () => unwrap(api.get('/data-sources')),
  reports: (params) => unwrap(api.get('/reports', { params })),
  report: (id) => unwrap(api.get(`/reports/${id}`)),
  users: () => unwrap(api.get('/admin/users')),
  scheduler: () => unwrap(api.get('/scheduler')),
  runScheduler: () => unwrap(api.post('/scheduler/run')),
};

export default api;
