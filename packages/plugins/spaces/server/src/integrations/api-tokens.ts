import type { Core } from '@strapi/types';
import type { Context } from 'koa';

import { TOKEN_BINDING_UID } from '../../../shared/constants';
import { getScope, runUnscoped } from '../scope/context';

/**
 * An API token is a standing grant, so the space it works in is decided when it
 * is issued rather than asked for per request — a token cannot be trusted to
 * say honestly which tenant it is calling on behalf of.
 *
 * The binding lives in this plugin's own table rather than as a column on the
 * token, because tokens are looked up while a request's space is still being
 * worked out; a space-scoped read at that point would have nothing to filter
 * by, and the query scope would refuse it.
 */
export const registerApiTokenIntegration = (strapi: Core.Strapi) => {
  strapi.db.lifecycles.subscribe({
    models: ['admin::api-token'],

    async afterCreate(event) {
      const token = event.result as { id: number } | undefined;
      const scope = getScope(strapi);

      // A token created from the cross-space view, the CLI or a migration is
      // not bound to anything, and keeps working across every space.
      if (!token?.id || scope.mode !== 'space') {
        return;
      }

      await runUnscoped(() =>
        strapi.db.query(TOKEN_BINDING_UID).create({
          data: { token: token.id, space: scope.id },
        })
      );
    },

    async afterDelete(event) {
      const token = event.result as { id: number } | undefined;

      if (!token?.id) {
        return;
      }

      await runUnscoped(() =>
        strapi.db.query(TOKEN_BINDING_UID).deleteMany({ where: { token: token.id } })
      );
    },
  });
};

/**
 * The space a request's token is bound to, if it is using one and it is bound.
 *
 * Consulted while a request's space is being settled, ahead of anything the
 * request itself asked for.
 */
export const resolveTokenSpace = async (
  strapi: Core.Strapi,
  ctx: Context
): Promise<{ id: number; slug: string } | undefined> => {
  const auth = ctx.state?.auth as
    | { strategy?: { name?: string }; credentials?: { id?: number } }
    | undefined;

  const strategy = auth?.strategy?.name;

  if (strategy !== 'api-token' && strategy !== 'admin-token') {
    return undefined;
  }

  const tokenId = auth?.credentials?.id;

  if (!tokenId) {
    return undefined;
  }

  const binding = await runUnscoped(() =>
    strapi.db.query(TOKEN_BINDING_UID).findOne({
      where: { token: tokenId },
      populate: { space: true },
    })
  );

  const space = binding?.space as { id: number; slug: string; status: string } | undefined;

  return space?.status === 'active' ? { id: space.id, slug: space.slug } : undefined;
};
