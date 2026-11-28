import { useTypedSelector } from '../core/store/hooks';
import { selectAdminPermissions } from '../selectors';
import { useGetSecuritySettingsQuery } from '../services/securitySettings';
import { isMfaFeatureEnabled } from '../utils/mfaFeature';

import { useRBAC } from './useRBAC';

/**
 * Read-only view of the two-factor requirement for the roles pages. Returns `null` while the
 * feature is off, when the caller cannot read the security settings, or while they load, so
 * callers render nothing extra. Otherwise returns a predicate telling whether a role is covered:
 * everyone ("required"), or the role is listed under "Required for selected roles".
 */
const useRoleTwoFactorRequirement = (): ((roleId: string | number) => boolean) | null => {
  const enabled = isMfaFeatureEnabled();
  const permissions = useTypedSelector(selectAdminPermissions);
  const {
    isLoading: isLoadingRBAC,
    allowedActions: { canRead },
  } = useRBAC({ read: permissions.settings?.security?.read ?? [] });

  const { data: settings } = useGetSecuritySettingsQuery(undefined, {
    skip: !enabled || isLoadingRBAC || !canRead,
  });

  if (!enabled || isLoadingRBAC || !canRead || !settings) {
    return null;
  }

  const { mfa } = settings;

  return (roleId) =>
    mfa.mode === 'required' ||
    (mfa.mode === 'optional' && mfa.requiredRoles.includes(String(roleId)));
};

export { useRoleTwoFactorRequirement };
