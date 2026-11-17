import { errors, policy } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { USER_UID } from '../constants';
import { signedInEndUser } from './signed-in';
import type { PolicyContext } from './signed-in';

const { createPolicy } = policy;

/**
 * `plugin::end-users.has-two-factor`: the signed-in end user has two-factor authentication enabled,
 * and the session of this request passed a second factor. Enabled is read from the user's row, which
 * means a user who has just turned it off is refused at once; whether the session passed one is
 * what the strategy put on the credentials. A provider, a magic link or an emailed code can sign a
 * user in with no challenge, so enabled alone says nothing about this session. Refused with code
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

    if (user.passedSecondFactor !== true) {
      throw new errors.PolicyError(
        'Sign in again with your second factor: this session did not use it.',
        { code: 'TWO_FACTOR_REQUIRED' }
      );
    }

    return true;
  },
});

export default hasTwoFactor;
