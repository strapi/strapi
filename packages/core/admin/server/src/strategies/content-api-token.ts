import type { Context } from 'koa';
import { castArray } from 'lodash/fp';
import { errors } from '@strapi/utils';
import constants from '../services/constants';
import { getService } from '../utils';
import { extractToken, checkExpiry, updateLastUsedAt } from './api-token-utils';
import '@strapi/types';

const { UnauthorizedError, ForbiddenError } = errors;

const isReadScope = (scope: string) => scope.endsWith('find') || scope.endsWith('findOne');

/**
 * Authenticate a content-api token. Rejects tokens with kind !== 'content-api'.
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

  // Defensive kind check — only handle content-api tokens.
  // null kind is allowed: tokens created before the kind field was introduced are implicitly content-api.
  if (apiToken.kind !== 'content-api' && apiToken.kind !== null) {
    return { authenticated: false };
  }

  const expiryError = checkExpiry(apiToken);
  if (expiryError !== null) {
    return { authenticated: false, error: expiryError };
  }

  await updateLastUsedAt(apiToken);

  if (apiToken.type === constants.API_TOKEN_TYPE.CUSTOM) {
    const ability = await strapi.contentAPI.permissions.engine.generateAbility(
      apiToken.permissions.map((action: string) => ({ action }))
    );

    return { authenticated: true, ability, credentials: apiToken };
  }

  return { authenticated: true, credentials: apiToken };
};

/**
 * Verify the token has the required abilities for the requested scope.
 *
 * @type {import('.').VerifyFunction}
 */
export const verify = (auth: any, config: any) => {
  const { credentials: apiToken, ability } = auth;

  if (apiToken === null || apiToken === undefined) {
    throw new UnauthorizedError('Token not found');
  }

  const expiryError = checkExpiry(apiToken);
  if (expiryError !== null) {
    throw expiryError;
  }

  // Full access
  if (apiToken.type === constants.API_TOKEN_TYPE.FULL_ACCESS) {
    return;
  }

  // Read only
  if (apiToken.type === constants.API_TOKEN_TYPE.READ_ONLY) {
    const scopes = castArray(config.scope);

    if (config.scope && scopes.every(isReadScope)) {
      return;
    }
  }

  // Custom
  else if (apiToken.type === constants.API_TOKEN_TYPE.CUSTOM) {
    if (ability === null || ability === undefined) {
      throw new ForbiddenError();
    }

    const scopes = castArray(config.scope);
    const isAllowed = scopes.every((scope: string) => ability.can(scope));

    if (isAllowed === true) {
      return;
    }
  }

  throw new ForbiddenError();
};

export default {
  name: 'content-api-token',
  authenticate,
  verify,
};
