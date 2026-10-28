import type { Context, Next } from 'koa';
import type { Core } from '@strapi/types';

import rateLimit from './rateLimit';

/**
 * `admin::rateLimit`, applied only while the MFA feature is on.
 *
 * `/reset-password` needs a limiter because it can now answer with a second-factor challenge, so
 * it verifies a code like `/login/mfa` does. That reason disappears with the flag off, and a
 * flagged feature must leave the unflagged route exactly as it was -- otherwise every existing
 * install silently gains a throttle on password resets the moment this ships, which is a change
 * nobody opted into and not one this PR is entitled to make.
 *
 * Resolved per request rather than at route-definition time: the routes array is built before the
 * configuration is loaded, and the kill switch in `admin.auth.mfa.enabled` can move at runtime.
 */
export default (config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  const limit = rateLimit(config, { strapi });

  return async (ctx: Context, next: Next) => {
    if (!strapi.service('admin::mfa').isEnabled()) {
      return next();
    }

    return limit(ctx, next);
  };
};
