'use strict';

const { castArray } = require('lodash/fp');
const { UnauthorizedError, ForbiddenError } = require('@strapi/utils').errors;
const constants = require('../services/constants');
const { getService } = require('../utils');

const isReadScope = scope => scope.endsWith('find') || scope.endsWith('findOne');

const extractToken = ctx => {
  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    const parts = ctx.request.header.authorization.split(/\s+/);

    if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) {
      return null;
    }

    return parts[1];
  }

  return null;
};

/** @type {import('.').AuthenticateFunction} */
const authenticate = async ctx => {
  const apiTokenService = getService('api-token');
  const token = extractToken(ctx);

  if (!token) {
    return { authenticated: false };
  }

  const apiToken = await apiTokenService.getBy({
    accessKey: apiTokenService.hash(token),
  });

  if (!apiToken) {
    return { authenticated: false };
  }

  // update lastUsed
  await apiTokenService.update(apiToken.id, {
    lastUsed: new Date(),
  });

  if (apiToken.type === constants.API_TOKEN_TYPE.CUSTOM) {
    const ability = await strapi.contentAPI.permissions.engine.generateAbility(
      apiToken.permissions.map(action => ({ action }))
    );

    return { authenticated: true, ability, credentials: apiToken };
  }

  return { authenticated: true, credentials: apiToken };
};

/** @type {import('.').VerifyFunction} */
const verify = (auth, config) => {
  const { credentials: apiToken, ability } = auth;

  if (!apiToken) {
    throw new UnauthorizedError();
  }

  // Full access
  if (apiToken.type === constants.API_TOKEN_TYPE.FULL_ACCESS) {
    return;
  }

  // Read only
  else if (apiToken.type === constants.API_TOKEN_TYPE.READ_ONLY) {
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

    const isAllowed = scopes.every(scope => ability.can(scope));

    if (isAllowed) {
      return;
    }
  }

  throw new ForbiddenError();
};

/** @type {import('.').AuthStrategy} */
module.exports = {
  name: 'api-token',
  authenticate,
  verify,
};
