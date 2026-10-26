import { getService } from '../../utils';
import permissionDomain from '../../domain/permission';
import type { CeilingPermission } from '../../domain/permission/ceiling';

interface EnforcedPermissionsOptions {
  /** i18n does not restrict a super admin's locales, so a missing key means every locale */
  holderIsSuperAdmin: boolean;
  /**
   * Whether to drop unregistered conditions (default `true`). The startup re-clamp passes
   * `false`: it runs before the app's `bootstrap()` registers custom conditions, and dropping
   * them there would delete or rewrite every token permission that inherits one.
   */
  conditions?: boolean;
}

/**
 * The permissions as the engine enforces them for a holder, to compare with
 * `permissionDomain.ceiling` (see `toEnforcedPermissions`). `locales` is enforced where
 * `actionProvider.appliesToProperty('locales', action, subject)` is true, i18n's own check for a
 * localized subject. A permission with no subject or an unregistered action never is. A
 * condition is registered when the condition provider knows it.
 */
export const toEnforcedCeilingPermissions = async <T extends CeilingPermission>(
  permissions: T[],
  { holderIsSuperAdmin, conditions = true }: EnforcedPermissionsOptions
): Promise<T[]> => {
  const { actionProvider, conditionProvider } = getService('permission');

  const keyOf = (permission: CeilingPermission) => `${permission.action}::${permission.subject}`;
  const localesEnforced = new Map<string, boolean>();

  if (!holderIsSuperAdmin) {
    for (const permission of permissions) {
      const key = keyOf(permission);

      if (!localesEnforced.has(key)) {
        const applies =
          !!permission.subject &&
          actionProvider.has(permission.action) &&
          (await actionProvider.appliesToProperty(
            'locales',
            permission.action,
            permission.subject
          ));

        localesEnforced.set(key, applies);
      }
    }
  }

  return permissionDomain.ceiling.toEnforcedPermissions(permissions, {
    isLocalesEnforced: (permission) => localesEnforced.get(keyOf(permission)) === true,
    isConditionRegistered: conditions
      ? (condition) => conditionProvider.has(condition)
      : () => true,
  });
};
