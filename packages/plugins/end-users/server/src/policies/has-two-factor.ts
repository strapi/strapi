import { errors, policy } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { USER_UID } from '../constants';
import { signedInEndUser } from './signed-in';
import type { PolicyContext } from './signed-in';

const { createPolicy } = policy;

/**
 * `plugin::end-users.has-two-factor`: the signed-in end user has two-factor authentication enabled.
 * The request's credentials don't carry the flag, so it is read from the user's row, which also
 * means a user who has just turned it off is refused at once. Refused with code
 * `TWO_FACTOR_REQUIRED`, the code the strategy uses for a role that requires it.
 */
export const hasTwoFactor = createPolicy({
  name: 'plugin::end-users.has-two-factor',
  async handler(ctx: PolicyContext, _config: unknown, { strapi }: { strapi: Core.Strapi }) {
    const user = signedInEndUser(ctx, strapi);
    const row = (await strapi.db.query(USER_UID).findOne({
      where: { documentId: user.documentId },
      select: ['twoFactorEnabled'],
    })) as { twoFactorEnabled?: boolean | null } | null;

    if (row?.twoFactorEnabled !== true) {
      throw new errors.PolicyError('Enable two-factor authentication to do this.', {
        code: 'TWO_FACTOR_REQUIRED',
      });
    }

    return true;
  },
});

export default hasTwoFactor;
