import { errors } from '@strapi/utils';

import type { Core } from '@strapi/types';
import type { Context } from 'koa';

import { TOKEN_PROFILES } from '../constants';
import { getService } from '../utils';

import type { TokenProfile } from '../domain/types';

export const createTokensController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: Context) {
    ctx.body = { data: await getService(strapi, 'tokenProfiles').list() };
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

    // Only Content API tokens have a profile: agents replace it for the admin side
    if (token === null || token.kind !== 'content-api') {
      throw new errors.NotFoundError('API token not found');
    }

    await tokenProfiles.set(id, profile as TokenProfile | null);

    ctx.body = { data: { id: String(id), profile } };
  },
});
