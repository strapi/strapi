import type { Core, UID } from '@strapi/types';
import { errors } from '@strapi/utils';

import { getService } from '../utils';

const { ValidationError } = errors;

interface MoveBody {
  uid?: UID.ContentType;
  documentIds?: string[];
  targetSpaceSlug?: string | null;
}

/**
 * POST /spaces/move — move N entries of a workspace-scoped CT to another
 * workspace, or share them with every workspace.
 *
 * Body:
 *   {
 *     uid: 'api::article.article',
 *     documentIds: ['abc', 'def', ...],
 *     targetSpaceSlug: 'acme'   // or null = share with every workspace
 *   }
 *
 * Authorization: requires admin authentication AND the `plugin::spaces.move-entry`
 * permission (enforced by the route's `admin::hasPermissions` policy). The
 * caller-side rules (a sub-workspace only moves its own rows, only the default
 * workspace shares) live in the `move` service so direct API calls can't bypass
 * them either.
 */
const move = ({ strapi }: { strapi: Core.Strapi }) => ({
  async moveToSpace(ctx: any) {
    const body = (ctx.request?.body ?? {}) as MoveBody;
    const { uid, documentIds, targetSpaceSlug } = body;

    if (!uid || typeof uid !== 'string') {
      throw new ValidationError('Missing or invalid `uid`');
    }
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      throw new ValidationError('Missing or empty `documentIds`');
    }
    if (targetSpaceSlug !== null && (!targetSpaceSlug || typeof targetSpaceSlug !== 'string')) {
      throw new ValidationError('Missing or invalid `targetSpaceSlug`');
    }

    const result = await getService('move').moveToSpace({
      uid: uid as UID.ContentType,
      documentIds,
      targetSpaceSlug: targetSpaceSlug ?? null,
    });

    ctx.body = result;
  },
});

export default move;
