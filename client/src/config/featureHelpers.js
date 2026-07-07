import FEATURES from './featureList';

// Get feature path based on role
export const getFeaturePath = (featureId, role) => {
  const feature = FEATURES.find(f => f.id === featureId);
  if (!feature) return '/access-denied';
  return feature.paths[role] || '/access-denied';
};

// Get feature API path based on role
export const getFeatureApiPath = (featureId, role) => {
  const feature = FEATURES.find(f => f.id === featureId);
  if (!feature) return null;
  return feature.apiPaths[role] || null;
};

// Get visible features based on role
export const getVisibleFeatures = (featureIds, role) => {
  return FEATURES.filter(f =>
    featureIds.includes(f.id) &&
    f.roles.includes(role) &&
    f.paths[role]
  );
};

// Get start path based on role
export const getStartPath = (featureIds, role) => {
  const normalizedRole = role.replace('-', '_');
  const dashboardId = `${normalizedRole}_dashboard`;
  const dashboard = FEATURES.find(
    f => f.id === dashboardId && featureIds.includes(f.id)
  );
  if (dashboard) return dashboard.paths[role];

  const first = FEATURES.find(
    f => featureIds.includes(f.id) && f.paths[role]
  );
  return first ? first.paths[role] : '/access-denied';
};
