import { errors } from '@strapi/utils';

import type { Core } from '@strapi/types';
import type { Context } from 'koa';

import { TOKEN_PROFILES } from '../constants';
import { getService } from '../utils';

import type { TokenProfile } from '../domain/types';

const SUPER_ADMIN_CODE = 'strapi-super-admin';

/**
 * Admin tokens follow the core rules: the admin tokens permission, and only their owner or
 * a super admin. Content API tokens only need the routes' API tokens permissions.
 */
const canAccess = (
  ctx: Context,
  action: 'read' | 'update',
  token: { kind: string; ownerId: string | null }
) => {
  if (token.kind !== 'admin') {
    return true;
  }

  const { user, userAbility } = ctx.state;
  const isSuperAdmin = (user?.roles ?? []).some(
    (role: { code?: string }) => role.code === SUPER_ADMIN_CODE
  );

  return (
    userAbility?.can(`admin::admin-tokens.${action}`) === true &&
    (isSuperAdmin || token.ownerId === String(user?.id))
  );
};

export const createTokensController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: Context) {
    const tokens = await getService(strapi, 'tokenProfiles').list();

    ctx.body = { data: tokens.filter((token) => canAccess(ctx, 'read', token)) };
  },

  async update(ctx: Context) {
    const { id } = ctx.params;
    const { profile } = (ctx.request.body ?? {}) as { profile?: unknown };

    if (profile !== null && !(TOKEN_PROFILES as readonly unknown[]).includes(profile)) {
      throw new errors.ValidationError(
        `"profile" must be one of ${TOKEN_PROFILES.join(', ')}, or null for unspecified`
      );
    }

    const tokenProfiles = getService(strapi, 'tokenProfiles');

    // Token ids are integers: anything else would be a database error on Postgres
    const token = /^[1-9]\d{0,9}$/.test(String(id)) ? await tokenProfiles.find(id) : null;

    if (token === null) {
      throw new errors.NotFoundError('API token not found');
    }

    if (!canAccess(ctx, 'update', token)) {
      throw new errors.ForbiddenError();
    }

    await tokenProfiles.set(id, profile as TokenProfile | null);

    ctx.body = { data: { id: String(id), profile } };
  },
});
