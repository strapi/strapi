import { errors } from '@strapi/utils';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { PER_USER_CACHE_CONTROL, PLUGIN_ID } from '../constants';
import type abilityService from '../services/ability';
import { isEndUsersStrategy } from '../strategies/end-users';

/**
 * `GET /api/end-users/permissions/me`: what the caller may do, for a front end deciding what to
 * show. Any caller of the end-users strategy may ask, Public included and whatever their roles
 * grant (the strategy's `ALWAYS_ALLOWED_SCOPES`).
 *
 * It answers from `ctx.state.auth`, the strategy's own result for this request, with its origin and
 * two-factor checks done, never from a session looked up again. A request the strategy did not
 * authenticate (an API token) has no end-user permissions to describe: 403. No cache keeps the
 * answer, which describes the caller's roles.
 */
const permissionsController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async forCaller(ctx: Koa.Context) {
    // The caller's own, like the `me` routes' answers
    ctx.set('Cache-Control', PER_USER_CACHE_CONTROL);

    const auth = ctx.state?.auth as { strategy?: { name?: unknown } } | undefined;

    if (!isEndUsersStrategy(auth?.strategy?.name)) {
      throw new errors.ForbiddenError();
    }

    const abilities = strapi.plugin(PLUGIN_ID).service('ability') as ReturnType<
      typeof abilityService
    >;

    ctx.body = { data: await abilities.describe(auth) };
  },
});

export default permissionsController;
