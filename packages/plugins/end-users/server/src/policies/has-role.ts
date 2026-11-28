import { errors, policy } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { validateHasRoleConfig } from '../validation/policies';
import { signedInEndUser } from './signed-in';
import type { PolicyContext } from './signed-in';

const { createPolicy } = policy;

export interface HasRoleConfig {
  /** Each a role's name or `documentId` */
  roles: string[];
  /** `any` (the default): one of the roles is enough; `all`: every one of them */
  mode?: 'any' | 'all';
}

/**
 * `plugin::end-users.has-role`: the signed-in end user holds one of the listed roles, or each of
 * them with `mode: 'all'`. A role is named by its name or its `documentId`, as the user's roles on
 * the request carry both. A route that lists no role is refused when Strapi resolves its policies,
 * at boot, and the handler checks again, so a config that never went through the registry fails
 * with an error rather than letting everyone through. Refused with code `ROLE_REQUIRED`; the
 * message does not name the roles.
 */
export const hasRole = createPolicy({
  name: 'plugin::end-users.has-role',
  validator(config: unknown) {
    validateHasRoleConfig(config);
  },
  handler(ctx: PolicyContext, config: unknown, { strapi }: { strapi: Core.Strapi }) {
    try {
      validateHasRoleConfig(config);
    } catch {
      throw new Error('Invalid config passed to "plugin::end-users.has-role" policy.');
    }

    const user = signedInEndUser(ctx, strapi);
    const { roles, mode = 'any' } = config as HasRoleConfig;
    const holds = (wanted: string) =>
      user.roles.some((role) => role.name === wanted || role.documentId === wanted);
    const allowed = mode === 'all' ? roles.every(holds) : roles.some(holds);

    if (!allowed) {
      throw new errors.PolicyError('Your roles do not allow this.', { code: 'ROLE_REQUIRED' });
    }

    return true;
  },
});

export default hasRole;
