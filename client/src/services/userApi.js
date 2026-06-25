// ============================================================
//  client/src/services/userApi.js  —  User Management API
// ============================================================

import API from './authApi';

export const getAllUsers = (params) => API.get('/users', { params });
export const getUserStats = () => API.get('/users/stats');
export const getUserById = (id) => API.get(`/users/${id}`);
export const createAdminAccount = (data) => API.post('/users/create-admin', data);
export const updateUserStatus = (id, data) => API.put(`/users/${id}/status`, data);
export const deleteUser = (id) => API.delete(`/users/${id}`);
export const getUserActivity = (id) => API.get(`/users/${id}/activity`);
