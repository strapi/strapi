import { errors } from '@strapi/utils';
import { getService } from '../utils';

const { ForbiddenError } = errors;

/**
 * Policy to ensure the authenticated user owns the app token
 * being accessed via the :id route parameter
 */
export default async (ctx: any) => {
  const tokenId = ctx.params.id;
  const userId = ctx.state.user.id;

  if (tokenId === undefined) {
    // No id parameter, allow (list route handles filtering)
    return true;
  }

  const appTokenService = getService('app-token');
  const token = await appTokenService.getById(tokenId);

  if (token === null) {
    // Token doesn't exist, let controller handle 404
    return true;
  }

  // Check ownership
  const isOwner = token.user?.id === userId;

  if (isOwner === false) {
    throw new ForbiddenError('You can only access your own app tokens');
  }

  return true;
};
