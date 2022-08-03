'use strict';

const { castArray, map, every, pipe } = require('lodash/fp');
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

      // Invalid token
      if (id === undefined) {
        return { authenticated: false };
      }

      const user = await getService('user').fetchAuthenticatedUser(id);

      // No user associated to the token
      if (!user) {
        return { error: 'Invalid credentials' };
      }

      const advancedSettings = await getAdvancedSettings();

      // User not confirmed
      if (advancedSettings.email_confirmation && !user.confirmed) {
        return { error: 'Invalid credentials' };
      }

      // User blocked
      if (user.blocked) {
        return { error: 'Invalid credentials' };
      }

      // Fetch user's permissions
      const permissions = await Promise.resolve(user.role.id)
        .then(getService('permission').findRolePermissions)
        .then(map(getService('permission').toContentAPIPermission));

      // Generate an ability (content API engine) based on the given permissions
      const ability = await strapi.contentAPI.permissions.engine.generateAbility(permissions);

      ctx.state.user = user;

      return {
        authenticated: true,
        credentials: user,
        ability,
      };
    }

    const publicPermissions = await getService('permission')
      .findPublicPermissions()
      .then(map(getService('permission').toContentAPIPermission));

    if (publicPermissions.length === 0) {
      return { authenticated: false };
    }

    const ability = await strapi.contentAPI.permissions.engine.generateAbility(publicPermissions);

    return {
      authenticated: true,
      credentials: null,
      ability,
    };
  } catch (err) {
    return { authenticated: false };
  }
};

const verify = async (auth, config) => {
  const { credentials: user, ability } = auth;

  if (!config.scope) {
    if (!user) {
      // A non authenticated user cannot access routes that do not have a scope
      throw new UnauthorizedError();
    } else {
      // An authenticated user can access non scoped routes
      return;
    }
  }

  // If no ability have been generated, then consider auth is missing
  if (!ability) {
    throw new UnauthorizedError();
  }

  const isAllowed = pipe(
    // Make sure we're dealing with an array
    castArray,
    // Transform the scope array into an action array
    every(scope => ability.can(scope))
  )(config.scope);

  if (!isAllowed) {
    throw new ForbiddenError();
  }
};

module.exports = {
  name: 'users-permissions',
  authenticate,
  verify,
};
