import axios from 'axios';
import { getAccessToken } from './tokenStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9003/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;

// Dashboard
export const dashboardApi = {
  getSummary: (params) => apiClient.get('/dashboard/summary', { params }),
};

// Accounts
export const accountApi = {
  getAll: (params) => apiClient.get('/accounts', { params }),
  getById: (id) => apiClient.get(`/accounts/${id}`),
  create: (data) => apiClient.post('/accounts', data),
  update: (id, data) => apiClient.put(`/accounts/${id}`, data),
  toggleArchive: (id) => apiClient.patch(`/accounts/${id}/archive`),
  adjustBalance: (id, data) => apiClient.post(`/accounts/${id}/adjust-balance`, data),
};

// Categories
export const categoryApi = {
  getAll: (params) => apiClient.get('/categories', { params }),
  create: (data) => apiClient.post('/categories', data),
  update: (id, data) => apiClient.put(`/categories/${id}`, data),
  delete: (id) => apiClient.delete(`/categories/${id}`),
};

// Transactions
export const transactionApi = {
  getAll: (params) => apiClient.get('/transactions', { params }),
  create: (data) => apiClient.post('/transactions', data),
  update: (id, data) => apiClient.put(`/transactions/${id}`, data),
  softDelete: (id) => apiClient.delete(`/transactions/${id}`),
  restore: (id) => apiClient.patch(`/transactions/${id}/restore`),
};

// Budgets
export const budgetApi = {
  getAll: (params) => apiClient.get('/budgets', { params }),
  create: (data) => apiClient.post('/budgets', data),
  update: (id, data) => apiClient.put(`/budgets/${id}`, data),
  delete: (id) => apiClient.delete(`/budgets/${id}`),
};

// Recurring Transactions
export const recurringApi = {
  getAll: (params) => apiClient.get('/recurring', { params }),
  create: (data) => apiClient.post('/recurring', data),
  update: (id, data) => apiClient.put(`/recurring/${id}`, data),
  delete: (id) => apiClient.delete(`/recurring/${id}`),
  getOccurrences: (params) => apiClient.get('/recurring/occurrences', { params }),
  postOccurrence: (id, data) => apiClient.post(`/recurring/occurrences/${id}/post`, data),
};

// Savings Goals
export const savingsApi = {
  getAll: (params) => apiClient.get('/savings', { params }),
  create: (data) => apiClient.post('/savings', data),
  update: (id, data) => apiClient.put(`/savings/${id}`, data),
  delete: (id) => apiClient.delete(`/savings/${id}`),
  recordContribution: (id, data) => apiClient.post(`/savings/${id}/contributions`, data),
  getHistory: (id) => apiClient.get(`/savings/${id}/history`),
};

// Reports
export const reportApi = {
  getSummary: (params) => apiClient.get('/reports/summary', { params }),
  getCategoryAnalysis: (params) => apiClient.get('/reports/category-analysis', { params }),
  getCashFlow: (params) => apiClient.get('/reports/cash-flow', { params }),
  exportCsv: (params = {}) => apiClient.get('/reports/export-csv', { params, responseType: 'blob' }),
};

// Notifications
export const notificationApi = {
  getAll: (params) => apiClient.get('/notifications', { params }),
  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.post('/notifications/mark-all-read'),
  delete: (id) => apiClient.delete(`/notifications/${id}`),
};

// Settings
export const settingsApi = {
  getSettings: () => apiClient.get('/settings'),
  updateProfile: (data) => apiClient.patch('/settings/profile', data),
  updatePreferences: (data) => apiClient.patch('/settings/preferences', data),
  getSessions: () => apiClient.get('/settings/sessions'),
  revokeSession: (id) => apiClient.delete(`/settings/sessions/${id}`),
  exportAllData: () => apiClient.get('/settings/export-all'),
  deleteAccount: () => apiClient.post('/settings/delete-account'),
};

