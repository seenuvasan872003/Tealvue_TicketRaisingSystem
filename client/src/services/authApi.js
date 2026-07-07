// ============================================================
//  client/src/services/authApi.js  —  Auth API Service
// ============================================================
//  Axios instance with JWT interceptor.
//  All other API files import this as their base instance.
// ============================================================

import axios from 'axios';
import logger from '../utils/logger';

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`,
});

// Attach token to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('tealue_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Log outgoing API request
  logger.info('authApi', 'request.interceptor', `[REQUEST] ${config.method?.toUpperCase()} ${config.url}`, {
    api: config.url, method: config.method?.toUpperCase(), action: 'API Request Sent',
  });
  return config;
});

// Intercept responses to handle global token expiration/tampering (401 Unauthorized)
API.interceptors.response.use(
  (response) => {
    // Log successful API response
    logger.info('authApi', 'response.interceptor', `[RESPONSE OK] ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status}`, {
      api: response.config.url, method: response.config.method?.toUpperCase(), status: response.status, action: 'API Response Success',
    });
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      logger.warn('authApi', 'response.interceptor', '[401 UNAUTHORIZED] Token expired or invalid — redirecting to login', {
        api: error.config?.url, method: error.config?.method?.toUpperCase(), status: 401, action: 'Auto Logout on 401',
      });
      localStorage.removeItem('tealue_token');
      window.location.href = '/login';
    } else {
      // Log all other API errors
      logger.error('authApi', 'response.interceptor', `[RESPONSE ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${error.response?.status || 'Network Error'}`, error, {
        api: error.config?.url, method: error.config?.method?.toUpperCase(),
        status: error.response?.status, action: 'API Response Error',
      });
    }
    return Promise.reject(error);
  }
);

// ── Auth endpoints ─────────────────────────────────────────
export const registerUser    = (data) => API.post('/auth/register', data);
export const loginUser       = (data) => API.post('/auth/login', data);
export const logoutUser      = ()     => API.post('/auth/logout');
export const fetchProfile    = ()     => API.get('/auth/profile');

// Update own profile — supports multipart/form-data for avatar upload
// Pass a FormData object: formData.append('name', ...) + formData.append('avatar', file)
export const updateProfileApi = (formData) =>
  API.put('/auth/profile', formData, {
    headers: { 'Content-Type' : 'multipart/form-data' },
  });

export default API;
