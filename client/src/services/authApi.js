// ============================================================
//  client/src/services/authApi.js  —  Auth API Service
// ============================================================
//  Axios instance with JWT interceptor.
//  All other API files import this as their base instance.
// ============================================================

import axios from 'axios';

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`,
});

// Attach token to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('tealue_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth endpoints ─────────────────────────────────────────
export const registerUser    = (data) => API.post('/auth/register', data);
export const loginUser       = (data) => API.post('/auth/login', data);
export const fetchProfile    = ()     => API.get('/auth/profile');

// Update own profile — supports multipart/form-data for avatar upload
// Pass a FormData object: formData.append('name', ...) + formData.append('avatar', file)
export const updateProfileApi = (formData) =>
  API.put('/auth/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export default API;
