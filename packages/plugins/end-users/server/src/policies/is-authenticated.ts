import { policy } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { signedInEndUser } from './signed-in';
import type { PolicyContext } from './signed-in';

const { createPolicy } = policy;

/**
 * `plugin::end-users.is-authenticated`: the request comes from a signed-in end user. A request on
 * the Public role, or with an API token, is refused with code `AUTHENTICATION_REQUIRED` (403).
 */
export const isAuthenticated = createPolicy({
  name: 'plugin::end-users.is-authenticated',
  handler(ctx: PolicyContext, _config: unknown, { strapi }: { strapi: Core.Strapi }) {
    signedInEndUser(ctx, strapi);

    return true;
  },
});

export default isAuthenticated;
