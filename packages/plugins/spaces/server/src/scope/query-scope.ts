import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';
import type { QueryScopeContext } from '@strapi/database';

import { SPACE_ATTRIBUTE, SPACE_UID } from '../../../shared/constants';
import { getScope } from './context';

/**
 * The `space_id` column of a model, or null if the model carries no space at
 * all — components, join tables, `admin::user`, the space registry itself.
 *
 * Read from the metadata rather than assumed, because the identifier shortener
 * can rename a column when the table name is long.
 */
const getSpaceColumn = (meta: QueryScopeContext['meta']): string | null => {
  const attribute = meta.attributes?.[SPACE_ATTRIBUTE] as
    | { type?: string; target?: string; joinColumn?: { name?: string } }
    | undefined;

  if (!attribute || attribute.type !== 'relation' || attribute.target !== SPACE_UID) {
    return null;
  }

  return attribute.joinColumn?.name ?? null;
};

/**
 * Refuses a query against space-scoped data made by a request that has no
 * space.
 *
 * Either the caller belongs to no space, or a route reached the database before
 * its scope was settled. Both are answered the same way, because the safe
 * response to "which space is this?" having no answer is to return nothing
 * rather than everything.
 */
const refuse = (uid: string, reason?: string): never => {
  throw new errors.ForbiddenError(
    reason ??
      `This request has no space, so "${uid}" cannot be read. If this runs outside a ` +
        `request, wrap it in runUnscoped() or runInSpace().`
  );
};

/**
 * The `where` clause that limits a query to the rows the current scope may see.
 *
 * Rows with no space (`space_id IS NULL`) are shared: platform-wide data every
 * space reads, which only the cross-space view may write. That is how reference
 * content, and anything seeded before Spaces was installed, stays reachable.
 */
export const createSpacesQueryScope =
  (strapi: Core.Strapi) =>
  (ctx: QueryScopeContext): Record<string, unknown> | null => {
    const column = getSpaceColumn(ctx.meta);

    if (!column) {
      return null;
    }

    const scope = getScope(strapi);

    switch (scope.mode) {
      case 'unscoped':
      case 'global':
        return null;

      case 'space':
        // The column is addressed directly rather than through the `space`
        // attribute: naming an attribute would make the query builder add a
        // join to `strapi_spaces` for every read.
        return { $or: [{ [column]: scope.id }, { [column]: { $null: true } }] };

      case 'unresolved':
        return refuse(ctx.uid, scope.reason);

      default:
        return null;
    }
  };

/**
 * Installs the scope on the database. Every query the database builds — reads,
 * counts, conditional updates and deletes, and the separate queries that
 * populate relations — is narrowed by it from this point on.
 */
export const registerQueryScope = (strapi: Core.Strapi) =>
  strapi.db.queryScopes.register('spaces', createSpacesQueryScope(strapi));
