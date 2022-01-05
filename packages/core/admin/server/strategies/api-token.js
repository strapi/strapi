'use strict';

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
  if (ctx.query.access_token) {
    return ctx.query.access_token;
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

  return { authenticated: true, credentials: apiToken };
};

/** @type {import('.').VerifyFunction} */
const verify = (auth, config) => {
  const { credentials: apiToken } = auth;

  if (!apiToken) {
    throw new UnauthorizedError();
  }

  if (apiToken.type === constants.API_TOKEN_TYPE.FULL_ACCESS) {
    return;
  }

  /**
   * If you don't have `full-access` you can only access `find` and `findOne`
   * scopes. If the route has no scope, then you can't get access to it.
   */

  const scopes = Array.isArray(config.scope) ? config.scope : [config.scope];
  if (config.scope && scopes.every(isReadScope)) {
    return;
  }

  throw new ForbiddenError();
};

/** @type {import('.').AuthStrategy} */
module.exports = {
  name: 'api-token',
  authenticate,
  verify,
};
