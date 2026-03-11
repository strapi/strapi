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

  if (owner === null || owner === undefined || typeof owner !== 'object') {
    return { authenticated: false, error: new UnauthorizedError('Token owner not found') };
  }

  if (owner.isActive !== true || owner.blocked === true) {
    return { authenticated: false, error: new UnauthorizedError('Token owner is deactivated') };
  }

  const ability = await getService('permission').engine.generateTokenAbility(
    apiToken.adminPermissions ?? [],
    owner
  );

  ctx.state.userAbility = ability;
  ctx.state.user = owner;

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
