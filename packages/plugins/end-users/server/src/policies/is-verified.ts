import { errors, policy } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { signedInEndUser } from './signed-in';
import type { PolicyContext } from './signed-in';

const { createPolicy } = policy;

/**
 * `plugin::end-users.is-verified`: the signed-in end user has verified their email address. The
 * flag comes from the user's row, which the strategy reads on every request, so a user who has
 * just verified is let through by their next request. Refused with code `EMAIL_NOT_VERIFIED`, the
 * code the strategy uses when the Sign-in settings require a verified address everywhere.
 */
export const isVerified = createPolicy({
  name: 'plugin::end-users.is-verified',
  handler(ctx: PolicyContext, _config: unknown, { strapi }: { strapi: Core.Strapi }) {
    const user = signedInEndUser(ctx, strapi);

    if (user.emailVerified !== true) {
      throw new errors.PolicyError('Verify your email address to do this.', {
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    return true;
  },
});

export default isVerified;
