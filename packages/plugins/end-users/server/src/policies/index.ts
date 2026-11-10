import { hasAnyAdminPermission } from './has-any-admin-permission';
import { hasRole } from './has-role';
import { hasTwoFactor } from './has-two-factor';
import { isAuthenticated } from './is-authenticated';
import { isDevelopment } from './is-development';
import { isVerified } from './is-verified';

export default {
  'has-any-admin-permission': hasAnyAdminPermission,
  'is-development': isDevelopment,
  // For a project's own REST routes
  'is-authenticated': isAuthenticated,
  'has-role': hasRole,
  'is-verified': isVerified,
  'has-two-factor': hasTwoFactor,
};
