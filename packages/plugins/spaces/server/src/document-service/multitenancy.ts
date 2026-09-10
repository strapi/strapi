import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import {
  isSharedContentType,
  isSharedEditableContentType,
  isSpaceScopedContentType,
} from '../services/content-types';
import { isCTVisibleInSpace } from '../services/visibility';
import {
  MESSAGES,
  WorkspaceAccessError,
  assertWritable,
  resolvePlacement,
} from '../services/access';
import { getRequestSpace, getScopeOverride, runScoped, runUnscoped } from '../utils/space-scope';

const { ValidationError } = errors;

const CREATE_ACTIONS = new Set(['create', 'clone']);
const MUTATE_ACTIONS = new Set(['update', 'delete', 'publish', 'unpublish', 'discardDraft']);

type SpaceInput = number | string | { id?: number; slug?: string } | null | undefined;

/**
 * Where a new entry goes (the "create" column of the decision table):
 *   - shared content type: NULL from default or a shared-editable sub-workspace,
 *     refused from any other sub-workspace;
 *   - sub-workspace: forced to that workspace (a body value is ignored);
 *   - default: the body's `space` (id, slug, `{ id }`, `{ slug }` or `null` =
 *     shared), validated against the type's visibility; default otherwise;
 *   - no header: the body's `space` if any, else NULL (headerless code paths —
 *     CLI, bootstrap — are not stamped by the middleware; the `beforeCreate`
 *     lifecycle handles the rest).
 */
export const resolveCreateTarget = async (
  strapi: Core.Strapi,
  contentType: { uid: string },
  input: SpaceInput
): Promise<number | null | undefined> => {
  const request = getRequestSpace(strapi);
  const override = getScopeOverride();

  if (isSharedContentType(contentType)) {
    if (request && !request.isDefault && !isSharedEditableContentType(contentType)) {
      throw new WorkspaceAccessError(MESSAGES['shared-content-type'], {
        reason: 'shared-content-type',
      });
    }
    return null;
  }

  if (override) {
    return override.target;
  }

  if (request && !request.isDefault) {
    return request.id;
  }

  if (input === undefined) {
    return request ? request.id : undefined;
  }
  if (input === null) {
    return null;
  }

  const space = await resolveSpaceInput(strapi, input);
  if (!space) {
    throw new ValidationError('Unknown target workspace');
  }
  if (!isCTVisibleInSpace(contentType, space.slug)) {
    throw new ValidationError(`This content type is not available in workspace "${space.slug}"`);
  }
  return space.id;
};

const resolveSpaceInput = async (
  strapi: Core.Strapi,
  input: Exclude<SpaceInput, null | undefined>
): Promise<{ id: number; slug: string } | null> => {
  const where =
    typeof input === 'number'
      ? { id: input }
      : typeof input === 'string'
        ? { slug: input }
        : input.id !== undefined
          ? { id: input.id }
          : input.slug !== undefined
            ? { slug: input.slug }
            : null;
  if (!where) {
    return null;
  }
  const space = await strapi.db
    .query('plugin::spaces.space')
    .findOne({ where, select: ['id', 'slug'] });
  return space ? { id: space.id, slug: space.slug } : null;
};

/**
 * The workspace of an existing document, read across every workspace so a
 * caller can be told "not yours" (404) rather than silently "not found".
 *
 * A document has one row per locale and publication state, and they all carry
 * the same workspace — except an inherited document a workspace has overridden,
 * which has rows in two places at once: the shared original and that
 * workspace's copy. Which one is "the" entry depends on who is asking, so the
 * rows are collected and `resolvePlacement` answers the same way the read net
 * does. Picking the first row back would be a coin flip.
 */
export const lookupEntrySpace = async (
  strapi: Core.Strapi,
  uid: string,
  documentId: string,
  requestSpaceId?: number
): Promise<{ found: boolean; spaceId: number | null; isOverride: boolean }> => {
  const rows = (await runUnscoped(() =>
    strapi.db.query(uid).findMany({
      where: { documentId },
      select: ['id', 'spaceOverride'],
      populate: { space: { select: ['id'] } },
    })
  )) as Array<{ space?: { id: number } | null; spaceOverride?: boolean }>;

  if (rows.length === 0) {
    return { found: false, spaceId: null, isOverride: false };
  }

  const placement = resolvePlacement(
    rows.map((row) => ({
      spaceId: row.space?.id ?? null,
      isOverride: row.spaceOverride === true,
    })),
    requestSpaceId
  );

  if (!placement) {
    // Every row belongs to another workspace: visible to none of the caller's.
    return { found: true, spaceId: rows[0].space?.id ?? null, isOverride: false };
  }
  return { found: true, spaceId: placement.spaceId, isOverride: placement.isOverride };
};

/**
 * Document-service middleware: decides, per operation, which workspace an
 * entry belongs to and runs the operation inside that scope (`runScoped`), so
 * every raw read underneath — the entity validator's uniqueness query, relation
 * resolution, the document service's own lookups — sees that workspace's rows.
 *
 * Reads are not touched here: the DB read net (`db-read-net.ts`) is the single
 * read filter, and the default workspace sees everything.
 */
export const createMultitenancyMiddleware = (strapi: Core.Strapi) => {
  const middleware = async (ctx: any, next: () => any): Promise<any> => {
    const contentType = ctx.contentType;
    if (!isSpaceScopedContentType(contentType)) {
      return next();
    }

    ctx.params = ctx.params ?? {};

    if (CREATE_ACTIONS.has(ctx.action)) {
      const target = await resolveCreateTarget(strapi, contentType, ctx.params.data?.space);
      if (target !== undefined) {
        ctx.params.data = { ...(ctx.params.data ?? {}), space: target };
        return runScoped(target, next);
      }
      return next();
    }

    if (MUTATE_ACTIONS.has(ctx.action)) {
      const documentId = ctx.params.documentId as string | undefined;
      if (!documentId) {
        return next();
      }

      const request = getRequestSpace(strapi);
      const { found, spaceId, isOverride } = await lookupEntrySpace(
        strapi,
        contentType.uid,
        documentId,
        request?.id
      );
      if (!found) {
        // Let the document service answer with its own "not found".
        return next();
      }

      assertWritable({ model: contentType, request, entrySpaceId: spaceId, isOverride });

      /**
       * Deleting a workspace's copy of an inherited entry would put the
       * workspace back on the original — the entry would come back, which is
       * not what "delete" promises. Resetting is the operation that means that,
       * and it says so.
       */
      if (ctx.action === 'delete' && isOverride && !getScopeOverride()) {
        throw new WorkspaceAccessError(MESSAGES['override-delete'], { reason: 'override-delete' });
      }

      if (ctx.action === 'update' && ctx.params.data) {
        // New locale rows are created through `update`: keep them with their document.
        ctx.params.data = { ...ctx.params.data, space: spaceId };
      }

      // `asOverride` carries the mark to the rows this operation creates on its
      // own — the published row a publish builds from the draft, a locale added
      // later. Without it they would look like ordinary entries of the
      // workspace and surface in the default workspace's list.
      return runScoped(spaceId, next, { asOverride: isOverride });
    }

    return next();
  };

  return middleware as any;
};
