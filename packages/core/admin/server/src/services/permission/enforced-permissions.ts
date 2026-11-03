import { isEmpty } from 'lodash';

import { getService } from '../../utils';
import permissionDomain from '../../domain/permission';
import type { CeilingPermission } from '../../domain/permission/ceiling';

interface EnforcedPermissionsOptions {
  /**
   * Whether to drop unregistered conditions (default `true`). The startup re-clamp passes
   * `false`: it runs before the app's `bootstrap()` registers custom conditions, and dropping
   * them there would delete or rewrite every token permission that inherits one.
   */
  conditions?: boolean;
}

/**
 * The permissions as the engine enforces them, to compare with
 * `permissionDomain.ceiling` (see `toEnforcedPermissions`). `locales` is enforced where
 * `actionProvider.appliesToProperty('locales', action, subject)` is true, i18n's own check for a
 * localized subject. A permission with no subject or an unregistered action never is. A
 * condition is registered when the condition provider knows it.
 *
 * The holder's role does not matter: i18n's hook skips super admins by reading `context.user`,
 * which the engine never sets (the hook context spreads the user object itself), so a super
 * admin's or a super-admin-owned token's permission with no `locales` key holds no locale too.
 */
export const toEnforcedCeilingPermissions = async <T extends CeilingPermission>(
  permissions: T[],
  { conditions = true }: EnforcedPermissionsOptions = {}
): Promise<T[]> => {
  const { actionProvider, conditionProvider } = getService('permission');

  const keyOf = (permission: CeilingPermission) => `${permission.action}::${permission.subject}`;
  const localesEnforced = new Map<string, boolean>();

  for (const permission of permissions) {
    const key = keyOf(permission);

    if (!localesEnforced.has(key)) {
      const applies =
        !!permission.subject &&
        actionProvider.has(permission.action) &&
        (await actionProvider.appliesToProperty('locales', permission.action, permission.subject));

      localesEnforced.set(key, applies);
    }
  }

  return permissionDomain.ceiling.toEnforcedPermissions(permissions, {
    isLocalesEnforced: (permission) => localesEnforced.get(keyOf(permission)) === true,
    isConditionRegistered: conditions
      ? (condition) => conditionProvider.has(condition)
      : () => true,
  });
};

/**
 * The permissions with action parameters, read the way the engine enforces their properties and
 * conditions (`toEnforcedCeilingPermissions`). That function drops every permission with action
 * parameters, since the plain action does not match them, so the parameters are set aside while
 * it runs and put back after. Permissions without action parameters are left out.
 */
export const toEnforcedParameterizedPermissions = async <T extends CeilingPermission>(
  permissions: T[],
  options: EnforcedPermissionsOptions = {}
): Promise<T[]> => {
  const parameterized = permissions
    .filter((permission) => !isEmpty(permission.actionParameters))
    .map((permission) => ({
      ...permission,
      actionParameters: {},
      setAsideActionParameters: permission.actionParameters,
    }));

  const enforced = await toEnforcedCeilingPermissions(parameterized, options);

  return enforced.map(
    ({ setAsideActionParameters, ...permission }) =>
      ({ ...permission, actionParameters: setAsideActionParameters }) as unknown as T
  );
};
