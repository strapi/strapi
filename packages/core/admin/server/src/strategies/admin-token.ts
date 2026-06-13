import type { Context } from 'koa';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import { extractToken, checkExpiry } from './api-token-utils';
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

  const authResult = await apiTokenService.authenticateAdminToken(token);

  if (authResult.authenticated === true) {
    ctx.state.userAbility = authResult.ability;
    ctx.state.user = authResult.user;
  }

  return authResult;
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
