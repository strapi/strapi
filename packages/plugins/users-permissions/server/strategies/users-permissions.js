'use strict';

const { castArray, map } = require('lodash/fp');
const { ForbiddenError, UnauthorizedError } = require('@strapi/utils').errors;

const { getService } = require('../utils');

const getAdvancedSettings = () => {
  return strapi.store({ type: 'plugin', name: 'users-permissions' }).get({ key: 'advanced' });
};

const authenticate = async ctx => {
  try {
    const token = await getService('jwt').getToken(ctx);

    if (token) {
      const { id } = token;

      if (id === undefined) {
        return { authenticated: false };
      }

      // fetch authenticated user
      const user = await getService('user').fetchAuthenticatedUser(id);

      if (!user) {
        return { error: 'Invalid credentials' };
      }

      const advancedSettings = await getAdvancedSettings();

      if (advancedSettings.email_confirmation && !user.confirmed) {
        return { error: 'Invalid credentials' };
      }

      if (user.blocked) {
        return { error: 'Invalid credentials' };
      }

      ctx.state.user = user;

      return {
        authenticated: true,
        credentials: user,
      };
    }

    const publicPermissions = await strapi.query('plugin::users-permissions.permission').findMany({
      where: {
        role: { type: 'public' },
      },
    });

    if (publicPermissions.length === 0) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      credentials: null,
    };
  } catch (err) {
    return { authenticated: false };
  }
};

const verify = async (auth, config) => {
  const { credentials: user } = auth;

  // A non authenticated user cannot access routes that do not have a scope
  if (!user && !config.scope) {
    throw new UnauthorizedError();
  }

  let allowedActions = auth.allowedActions;

  if (!allowedActions) {
    const permissions = await strapi.query('plugin::users-permissions.permission').findMany({
      where: { role: user ? user.role.id : { type: 'public' } },
    });

    allowedActions = auth.allowedActions = map('action', permissions);
  }

  const isAllowed = castArray(config.scope).every(scope => allowedActions.includes(scope));

  if (!isAllowed) {
    throw new ForbiddenError();
  }
};

module.exports = {
  name: 'users-permissions',
  authenticate,
  verify,
};
