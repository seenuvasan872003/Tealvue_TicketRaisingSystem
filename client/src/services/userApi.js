// ============================================================
//  client/src/services/userApi.js  —  User Management API
// ============================================================

import API from './authApi';
import { callFeatureApi } from './apiResolver';
import { getFeatureApiPath } from '../config/featureHelpers';

export const getAllUsers = (params) => callFeatureApi('all_users', null, 'GET', null, params);

export const getUserStats = () => {
  const role = localStorage.getItem('user_role') || 'user';
  const apiPath = getFeatureApiPath('all_users', role);
  if (!apiPath) return Promise.reject(new Error('No API path found'));
  const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
  return API.get(`${relativePath}/stats`);
};

export const getUserById = (id) => API.get(`/users/${id}`);
export const createAdminAccount = (data) => callFeatureApi('create_admin', null, 'POST', data);
export const updateUserStatus = (id, data) => API.put(`/users/${id}/status`, data);
export const deleteUser = (id) => API.delete(`/users/${id}`);
export const getUserActivity = (id) => API.get(`/users/${id}/activity`);
export const unblockUser = (id) => {
  const role = localStorage.getItem('user_role') || 'super-admin';
  const apiPath = getFeatureApiPath('roles_features', role);
  if (!apiPath) return Promise.reject(new Error('No API path found'));
  const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
  return API.put(`${relativePath}/unblock/${id}`);
};
