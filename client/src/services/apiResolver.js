import { getFeatureApiPath } from '../config/featureHelpers';
import API from './authApi';

export const callFeatureApi = (featureId, role, method = 'GET', data = null, params = null) => {
  const activeRole = role || localStorage.getItem('user_role') || 'user';
  const apiPath = getFeatureApiPath(featureId, activeRole);
  if (!apiPath) {
    return Promise.reject(new Error('No API path found for this feature and role'));
  }
  // Strip '/api' prefix since the API axios instance already has '/api' in its baseURL
  const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
  return API({ method, url: relativePath, data, params });
};
