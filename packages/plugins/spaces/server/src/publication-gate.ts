import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { DEFAULT_SPACE_SLUG, normalizeCapabilities } from './services/spaces';
import { getService } from './utils';

const { ForbiddenError } = errors;

const GATED_ACTIONS = new Set(['publish', 'unpublish']);

/**
 * Document-service middleware gating PUBLICATION per workspace (`publish`
 * capability): a workspace without it can draft freely but never
 * publish/unpublish — the agency-client pattern where the client edits in
 * their workspace and publication happens from default. Applies to every
 * content type: publication is an act of the workspace, not of the schema.
 */
export const createPublicationGateMiddleware = (strapi: Core.Strapi) => {
  const middleware = async (ctx: any, next: () => any): Promise<any> => {
    if (!GATED_ACTIONS.has(ctx.action)) {
      return next();
    }

    const spaceSlug = strapi.requestContext.get()?.state?.spaceSlug as string | undefined;
    if (!spaceSlug || spaceSlug === DEFAULT_SPACE_SLUG) {
      return next();
    }

    const space = await getService('spaces').resolveHeaderValue(spaceSlug);
    const capabilities = normalizeCapabilities(space?.capabilities);

    if (!capabilities.publish) {
      throw new ForbiddenError('Publishing is disabled in this workspace');
    }

    return next();
  };

  return middleware as any;
};
