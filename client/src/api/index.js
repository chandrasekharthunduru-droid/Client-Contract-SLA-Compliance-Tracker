/**
 * API layer — Automatically uses mock API when backend is unavailable.
 * Set VITE_USE_MOCK=true in .env to force demo mode.
 */
import axios from 'axios';
import {
  mockAuthAPI, mockDashboardAPI, mockContractsAPI,
  mockCustomersAPI, mockSLAAPI, mockIncidentsAPI,
  mockAlertsAPI, mockReportsAPI, mockUsersAPI,
} from './mockApi';

// ── Feature flag: force demo mode ───────────────────────────
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ── Axios instance ───────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bsx_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bsx_token');
      localStorage.removeItem('bsx_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Demo mode detection ──────────────────────────────────────
// In demo mode all API calls go to the in-memory mock layer.
// Set in localStorage for easy toggling without server restart.
const isDemoMode = () => FORCE_MOCK || localStorage.getItem('bsx_demo') === 'true';

// ── Auth ───────────────────────────────────────────────────
export const authAPI = {
  login: (data) => isDemoMode() ? mockAuthAPI.login(data) : api.post('/auth/login', data),
  logout: () => isDemoMode() ? mockAuthAPI.logout() : api.post('/auth/logout'),
  me: () => isDemoMode() ? mockAuthAPI.me() : api.get('/auth/me'),
};

// ── Dashboard ──────────────────────────────────────────────
export const dashboardAPI = {
  getSummary: () => isDemoMode() ? mockDashboardAPI.getSummary() : api.get('/dashboard/summary'),
};

// ── Contracts ──────────────────────────────────────────────
export const contractsAPI = {
  getAll: (params) => isDemoMode() ? mockContractsAPI.getAll(params) : api.get('/contracts', { params }),
  getById: (id) => isDemoMode() ? mockContractsAPI.getById(id) : api.get(`/contracts/${id}`),
  create: (data) => isDemoMode() ? mockContractsAPI.create(data) : api.post('/contracts', data),
  update: (id, data) => isDemoMode() ? mockContractsAPI.update(id, data) : api.put(`/contracts/${id}`, data),
  delete: (id) => isDemoMode() ? mockContractsAPI.delete(id) : api.delete(`/contracts/${id}`),
  archive: (id) => isDemoMode() ? mockContractsAPI.archive(id) : api.put(`/contracts/${id}/archive`),
};

// ── Customers ──────────────────────────────────────────────
export const customersAPI = {
  getAll: (params) => isDemoMode() ? mockCustomersAPI.getAll(params) : api.get('/customers', { params }),
  getById: (id) => isDemoMode() ? mockCustomersAPI.getById(id) : api.get(`/customers/${id}`),
  create: (data) => isDemoMode() ? mockCustomersAPI.create(data) : api.post('/customers', data),
  update: (id, data) => isDemoMode() ? mockCustomersAPI.update(id, data) : api.put(`/customers/${id}`, data),
  delete: (id) => isDemoMode() ? mockCustomersAPI.delete(id) : api.delete(`/customers/${id}`),
};

// ── SLA ────────────────────────────────────────────────────
export const slaAPI = {
  getAll: (params) => isDemoMode() ? mockSLAAPI.getAll(params) : api.get('/sla', { params }),
  getById: (id) => isDemoMode() ? mockSLAAPI.getById(id) : api.get(`/sla/${id}`),
  create: (data) => isDemoMode() ? mockSLAAPI.create(data) : api.post('/sla', data),
  update: (id, data) => isDemoMode() ? mockSLAAPI.update(id, data) : api.put(`/sla/${id}`, data),
  delete: (id) => isDemoMode() ? mockSLAAPI.delete(id) : api.delete(`/sla/${id}`),
};

// ── Incidents ──────────────────────────────────────────────
export const incidentsAPI = {
  getAll: (params) => isDemoMode() ? mockIncidentsAPI.getAll(params) : api.get('/incidents', { params }),
  getById: (id) => isDemoMode() ? mockIncidentsAPI.getById(id) : api.get(`/incidents/${id}`),
  create: (data) => isDemoMode() ? mockIncidentsAPI.create(data) : api.post('/incidents', data),
  update: (id, data) => isDemoMode() ? mockIncidentsAPI.update(id, data) : api.put(`/incidents/${id}`, data),
  close: (id) => isDemoMode() ? mockIncidentsAPI.close(id) : api.put(`/incidents/${id}/close`),
};

// ── Alerts ─────────────────────────────────────────────────
export const alertsAPI = {
  getAll: (params) => isDemoMode() ? mockAlertsAPI.getAll(params) : api.get('/alerts', { params }),
  markRead: (id) => isDemoMode() ? mockAlertsAPI.markRead(id) : api.put(`/alerts/${id}/read`),
  markAllRead: () => isDemoMode() ? mockAlertsAPI.markAllRead() : api.put('/alerts/read-all'),
  dismiss: (id) => isDemoMode() ? mockAlertsAPI.dismiss(id) : api.delete(`/alerts/${id}`),
};

// ── Reports ────────────────────────────────────────────────
export const reportsAPI = {
  getSummary: (params) => isDemoMode() ? mockReportsAPI.getSummary(params) : api.get('/reports/summary', { params }),
};

// ── Users (Staff) ──────────────────────────────────────────
export const usersAPI = {
  getAll: (params) => isDemoMode() ? mockUsersAPI.getAll(params) : api.get('/users', { params }),
  create: (data) => isDemoMode() ? mockUsersAPI.create(data) : api.post('/users', data),
  update: (id, data) => isDemoMode() ? mockUsersAPI.update(id, data) : api.put(`/users/${id}`, data),
  delete: (id) => isDemoMode() ? mockUsersAPI.delete(id) : api.delete(`/users/${id}`),
};

