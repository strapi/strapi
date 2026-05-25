import type { Core, UID } from '@strapi/types';
import { errors } from '@strapi/utils';

import { getService } from '../utils';

const { ValidationError } = errors;

interface MoveBody {
  uid?: UID.ContentType;
  documentIds?: string[];
  targetSpaceSlug?: string;
}

/**
 * POST /spaces/move — move N entries of a space-scoped CT to another space.
 *
 * Body:
 *   {
 *     uid: 'api::article.article',
 *     documentIds: ['abc', 'def', ...],
 *     targetSpaceSlug: 'acme'
 *   }
 *
 * Authorization: requires admin authentication AND the `plugin::spaces.move-entry`
 * permission (enforced by the route's `admin::hasPermissions` policy). A future slice
 * can add per-CT subject scoping once the role-flavor model lands.
 *
 * The eligibility check (target space must be in the CT's `visibleIn`) lives in the
 * `move` service so direct API calls can't bypass it either.
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
    if (!targetSpaceSlug || typeof targetSpaceSlug !== 'string') {
      throw new ValidationError('Missing or invalid `targetSpaceSlug`');
    }

    const result = await getService('move').moveToSpace({
      uid: uid as UID.ContentType,
      documentIds,
      targetSpaceSlug,
    });

    ctx.body = result;
  },
});

export default move;
