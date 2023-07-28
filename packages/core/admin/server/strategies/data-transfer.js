'use strict';

const { differenceInHours, parseISO } = require('date-fns');
const {
  errors: { UnauthorizedError, ForbiddenError },
} = require('@strapi/utils');
const { castArray, isNil } = require('lodash/fp');

const { getService } = require('../utils');

const extractToken = (ctx) => {
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
 *
 *  @type {import('.').AuthenticateFunction}
 */
const authenticate = async (ctx) => {
  const { token: tokenService } = getService('transfer');
  const token = extractToken(ctx);

  if (!token) {
    return { authenticated: false };
  }

  const transferToken = await tokenService.getBy({ accessKey: tokenService.hash(token) });

  // Check if the token exists
  if (!transferToken) {
    return { authenticated: false };
  }

  // Check if the token has expired
  const currentDate = new Date();

  if (!isNil(transferToken.expiresAt)) {
    const expirationDate = new Date(transferToken.expiresAt);

    if (expirationDate < currentDate) {
      return { authenticated: false, error: new UnauthorizedError('Token expired') };
    }
  }

  // Update token metadata if the token has not been used in the last hour
  const hoursSinceLastUsed = differenceInHours(currentDate, parseISO(transferToken.lastUsedAt));
  if (hoursSinceLastUsed >= 1) {
    await strapi.query('admin::api-token').update({
      where: { id: transferToken.id },
      data: { lastUsedAt: currentDate },
    });
  }

  // Generate an ability based on the token permissions
  const ability = await getService('transfer').permission.engine.generateAbility(
    transferToken.permissions.map((action) => ({ action }))
  );

  return { authenticated: true, ability, credentials: transferToken };
};

/**
 * Verify the token has the required abilities for the requested scope
 *
 *  @type {import('.').VerifyFunction}
 */
const verify = async (auth, config = {}) => {
  const { credentials: transferToken, ability } = auth;

  if (!transferToken) {
    throw new UnauthorizedError('Token not found');
  }

  const currentDate = new Date();

  if (!isNil(transferToken.expiresAt)) {
    const expirationDate = new Date(transferToken.expiresAt);
    // token has expired
    if (expirationDate < currentDate) {
      throw new UnauthorizedError('Token expired');
    }
  }

  if (!ability) {
    throw new ForbiddenError();
  }

  const scopes = castArray(config.scope ?? []);

  const isAllowed = scopes.every((scope) => ability.can(scope));

  if (!isAllowed) {
    throw new ForbiddenError();
  }
};

/** @type {import('.').AuthStrategy} */
module.exports = {
  name: 'data-transfer',
  authenticate,
  verify,
};
