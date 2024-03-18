import type { Context } from 'koa';
import { castArray, isNil } from 'lodash/fp';
import { differenceInHours, parseISO } from 'date-fns';
import { errors } from '@strapi/utils';
import constants from '../services/constants';
import { getService } from '../utils';
import '@strapi/types';

const { UnauthorizedError, ForbiddenError } = errors;

const isReadScope = (scope: any) => scope.endsWith('find') || scope.endsWith('findOne');

const extractToken = (ctx: Context) => {
  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    const parts = ctx.request.header.authorization.split(/\s+/);

    if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) {
      return null;
    }

    return parts[1];
  }

  return null;
};

/**
 * Authenticate the validity of the token
 */
export const authenticate = async (ctx: Context) => {
  const apiTokenService = getService('api-token');
  const token = extractToken(ctx);

  if (!token) {
    return { authenticated: false };
  }

  const apiToken = await apiTokenService.getBy({
    accessKey: apiTokenService.hash(token),
  });

  // token not found
  if (!apiToken) {
    return { authenticated: false };
  }

  const currentDate = new Date();

  if (!isNil(apiToken.expiresAt)) {
    const expirationDate = new Date(apiToken.expiresAt);
    // token has expired
    if (expirationDate < currentDate) {
      return { authenticated: false, error: new UnauthorizedError('Token expired') };
    }
  }

  // update lastUsedAt if the token has not been used in the last hour
  // @ts-expect-error - FIXME: verify lastUsedAt is defined
  const hoursSinceLastUsed = differenceInHours(currentDate, parseISO(apiToken.lastUsedAt));
  if (hoursSinceLastUsed >= 1) {
    await strapi.db.query('admin::api-token').update({
      where: { id: apiToken.id },
      data: { lastUsedAt: currentDate },
    });
  }

  if (apiToken.type === constants.API_TOKEN_TYPE.CUSTOM) {
    const ability = await strapi.contentAPI.permissions.engine.generateAbility(
      apiToken.permissions.map((action: any) => ({ action }))
    );

    return { authenticated: true, ability, credentials: apiToken };
  }

  return { authenticated: true, credentials: apiToken };
};

/**
 * Verify the token has the required abilities for the requested scope
 *
 *  @type {import('.').VerifyFunction}
 */
export const verify = (auth: any, config: any) => {
  const { credentials: apiToken, ability } = auth;

  if (!apiToken) {
    throw new UnauthorizedError('Token not found');
  }

  const currentDate = new Date();

  if (!isNil(apiToken.expiresAt)) {
    const expirationDate = new Date(apiToken.expiresAt);
    // token has expired
    if (expirationDate < currentDate) {
      throw new UnauthorizedError('Token expired');
    }
  }

  // Full access
  if (apiToken.type === constants.API_TOKEN_TYPE.FULL_ACCESS) {
    return;
  }

  // Read only
  if (apiToken.type === constants.API_TOKEN_TYPE.READ_ONLY) {
    /**
     * If you don't have `full-access` you can only access `find` and `findOne`
     * scopes. If the route has no scope, then you can't get access to it.
     */
    const scopes = castArray(config.scope);

    if (config.scope && scopes.every(isReadScope)) {
      return;
    }
  }

  // Custom
  else if (apiToken.type === constants.API_TOKEN_TYPE.CUSTOM) {
    if (!ability) {
      throw new ForbiddenError();
    }

    const scopes = castArray(config.scope);

    const isAllowed = scopes.every((scope) => ability.can(scope));

    if (isAllowed) {
      return;
    }
  }

  throw new ForbiddenError();
};

export const name = 'api-token';

export default {
  name: 'api-token',
  authenticate,
  verify,
};
