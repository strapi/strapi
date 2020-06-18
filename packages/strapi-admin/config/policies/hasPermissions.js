'use strict';

const { validateHasPermissionsInput } = require('../../validation/policies/hasPermissions');

module.exports = permissions => {
  try {
    validateHasPermissionsInput(permissions);
  } catch {
    throw new Error('Invalid objects submitted to admin::hasPermissions policy.');
  }

  return async (ctx, next) => {
    const { userAbility: ability } = ctx.state;

    const isAuthorized = permissions.every(({ action, subject }) => ability.can(action, subject));

    if (!isAuthorized) {
      throw strapi.errors.forbidden();
    }

    return next();
  };
};
