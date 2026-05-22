import type { Context } from 'koa';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import { extractToken, checkExpiry, updateLastUsedAt } from './api-token-utils';
import '@strapi/types';

const { UnauthorizedError } = errors;

/**
 * Authenticate an admin token. Rejects tokens with kind !== 'admin'.
 */
export const authenticate = async (ctx: Context) => {
  const apiTokenService = getService('api-token-admin');
  const token = extractToken(ctx);

  if (token === null) {
    return { authenticated: false };
  }

  const apiToken = await apiTokenService.getByAccessKey(apiTokenService.hash(token));

  if (apiToken === null || apiToken === undefined) {
    return { authenticated: false };
  }

  // Defensive kind check — only handle admin tokens
  if (apiToken.kind !== 'admin') {
    return { authenticated: false };
  }

  const expiryError = checkExpiry(apiToken);
  if (expiryError !== null) {
    return { authenticated: false, error: expiryError };
  }

  await updateLastUsedAt(apiToken);

  const owner = apiToken.adminUserOwner;
  const ownerId =
    // eslint-disable-next-line no-nested-ternary
    owner === null || owner === undefined ? null : typeof owner === 'object' ? owner.id : owner;

  if (ownerId === null) {
    return { authenticated: false, error: new UnauthorizedError('Token owner not found') };
  }

  // Token populate does not load `roles`; reload the user like session auth (`admin` strategy)
  // so `isSuperAdmin` and permission ceiling logic see the full admin user.
  const user = await strapi.db
    .query('admin::user')
    .findOne({ where: { id: ownerId }, populate: ['roles'] });

  if (user === null || user === undefined) {
    return { authenticated: false, error: new UnauthorizedError('Token owner not found') };
  }

  if (user.isActive !== true || user.blocked === true) {
    return { authenticated: false, error: new UnauthorizedError('Token owner is deactivated') };
  }

  const ability = await getService('permission').engine.generateTokenAbility(
    apiToken.adminPermissions ?? [],
    user
  );

  ctx.state.userAbility = ability;
  ctx.state.user = user;

  return { authenticated: true, credentials: apiToken, ability };
};

/**
 * Re-check presence and expiry at verify time.
 * Authorization is handled by isAuthenticatedAdmin + hasPermissions policies.
 *
 * @type {import('.').VerifyFunction}
 */
export const verify = (auth: any): void => {
  const { credentials: apiToken } = auth;

  if (apiToken === null || apiToken === undefined) {
    throw new UnauthorizedError('Token not found');
  }

  const expiryError = checkExpiry(apiToken);
  if (expiryError !== null) {
    throw expiryError;
  }
};

export default {
  name: 'admin-token',
  authenticate,
  verify,
};
