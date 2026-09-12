import { errors } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

import { SPACE_ATTRIBUTE, type SpaceScope } from '../../../shared/constants';
import { getScope } from '../scope/context';
import { assertRelationsWithinSpace } from './relations';

const { ApplicationError, ForbiddenError } = errors;

const WRITE_ACTIONS = new Set(['create', 'clone', 'update']);

interface MiddlewareContext {
  uid: string;
  action: string;
  params: Record<string, any>;
}

/**
 * Document-service middleware: the layer above the query scope.
 *
 * The query scope decides which rows exist as far as a caller is concerned.
 * This decides what they may ask for in the first place — whether the content
 * type is theirs to use, which space a new entry belongs to, and whether the
 * relations they are setting point somewhere they can see. Those are questions
 * about intent, which a `where` clause cannot answer.
 */
export const registerDocumentServiceMiddleware = (strapi: Core.Strapi) => {
  return strapi.documents.use(async (context, next) => {
    const { uid, action, params } = context as unknown as MiddlewareContext;

    if (!isSpaceScoped(strapi, uid)) {
      return next();
    }

    const scope = getScope(strapi);

    if (scope.mode === 'unscoped') {
      return next();
    }

    if (scope.mode === 'space') {
      await assertContentTypeIsAvailable(strapi, uid, scope);
    }

    if (!WRITE_ACTIONS.has(action)) {
      return next();
    }

    const targetSpaceId = await resolveTargetSpace(strapi, action, params, scope);

    if (targetSpaceId !== undefined) {
      await assertRelationsWithinSpace(strapi, uid, params.data, targetSpaceId);
    }

    return next();
  });
};

const isSpaceScoped = (strapi: Core.Strapi, uid: string): boolean =>
  Boolean(strapi.contentType(uid as UID.ContentType)?.attributes?.[SPACE_ATTRIBUTE]);

/**
 * A space can be restricted to some of the project's content types. Reaching
 * one it does not have is refused rather than answered with an empty list, so
 * the caller is told it is not theirs rather than that it is empty.
 */
const assertContentTypeIsAvailable = async (
  strapi: Core.Strapi,
  uid: string,
  scope: Extract<SpaceScope, { mode: 'space' }>
): Promise<void> => {
  // Only a project's own content types can be turned off for a space. Plugin
  // data a space needs in order to function is never on that list.
  if (!uid.startsWith('api::')) {
    return;
  }

  const space = await strapi.service('plugin::spaces.spaces').findById(scope.id);

  if (space && !strapi.service('plugin::spaces.spaces').isContentTypeAvailable(space, uid)) {
    throw new ForbiddenError(`"${uid}" is not available in the "${scope.slug}" space.`);
  }
};

/**
 * Settles which space a write belongs to, and rewrites `params.data` to say so.
 *
 * Returns the space the write lands in, or `undefined` when the write does not
 * decide ownership — an update inside a space, where the row already has an
 * owner that the scoped lookup has just proved.
 */
const resolveTargetSpace = async (
  strapi: Core.Strapi,
  action: string,
  params: Record<string, any>,
  scope: SpaceScope
): Promise<number | undefined> => {
  const data = (params.data ?? {}) as Record<string, unknown>;
  const requested = data[SPACE_ATTRIBUTE];
  const requestedId = idOf(requested);

  if (scope.mode === 'space') {
    // A space is a property of the request, not of the payload. Dropping a
    // caller-supplied one silently would let a write look like it moved an
    // entry when it did not.
    if (requestedId !== undefined && Number(requestedId) !== scope.id) {
      throw new ForbiddenError(
        'An entry cannot be assigned to another space from inside a space. ' +
          'Switch to that space, or use the all-spaces view.'
      );
    }

    if (action === 'update') {
      const { [SPACE_ATTRIBUTE]: _owner, ...rest } = data;
      params.data = rest;

      return scope.id;
    }

    params.data = { ...data, [SPACE_ATTRIBUTE]: scope.id };

    return scope.id;
  }

  // The all-spaces view has no ambient space to fall back on, so a new entry
  // has to say where it belongs. Without this the row would be written with no
  // space at all and become visible to every tenant.
  if (action !== 'update' && requestedId === undefined) {
    throw new ApplicationError(
      'Pick a space for this entry: creating content from the all-spaces view requires naming the space it belongs to.'
    );
  }

  if (requestedId === undefined) {
    return undefined;
  }

  const space = await strapi.service('plugin::spaces.spaces').findById(Number(requestedId));

  if (!space || space.status !== 'active') {
    throw new ApplicationError('That space does not exist, or has been archived.');
  }

  params.data = { ...data, [SPACE_ATTRIBUTE]: space.id };

  return space.id;
};

const idOf = (value: unknown): string | number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'object') {
    return (value as { id?: string | number }).id;
  }

  return value as string | number;
};
