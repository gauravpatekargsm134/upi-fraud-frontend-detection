import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

export const authAPI = {
  login: (credentials) => api.post('/login', credentials),
  register: (userData) => api.post('/register', userData),
  resetBalance: (payload = {}) => api.post('/user/reset-balance', payload),
};

export const paymentAPI = {
  processPayment: (payload) => api.post('/payment', payload),
  predictOnly: (payload) => api.post('/predict', payload),
  requestOtp: (payload) => api.post('/request-otp', payload),
  verifyOtp: (payload) => api.post('/verify-otp', payload),
};

export const dashboardAPI = {
  getDashboard: () => api.get('/dashboard'),
};

export const transactionAPI = {
  getTransactions: (params) => api.get('/transactions', { params }),
  getHistory: (params) => api.get('/history', { params }),
};

export const analyticsAPI = {
  getAnalytics: () => api.get('/analytics'),
  getModelPerformance: () => api.get('/model-performance'),
};

export const geminiAPI = {
  getStatus: () => api.get('/gemini/status'),
  explainShap: (payload) => api.post('/gemini/explain-shap', payload),
  explainTransaction: (txnId, payload = {}) => api.post(`/gemini/explain-transaction/${txnId}`, payload),
  explainLatest: (payload = {}) => api.post('/gemini/explain-latest', payload),
};

export const dbAPI = {
  getStatus: () => api.get('/db/status'),
};

export default api;
