export const canViewMenuItem = (item, permissions = [], featureFlags = {}, role = '', user = {}) => {
  if (!item) return false;

  // Check feature flag
  if (item.feature_flag && !featureFlags[item.feature_flag]) {
    return false;
  }

  // Check role
  if (item.roles && !item.roles.includes(role)) {
    return false;
  }

  // Check condition (like is_manager, has_subordinates)
  if (item.condition && !user?.[item.condition]) {
    return false;
  }

  // Check permissions
  if (item.permission && !permissions.includes(item.permission)) {
    return false;
  }

  return true;
};
