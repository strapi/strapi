'use strict';

const {
  policy: { createPolicyFactory },
} = require('strapi-utils');
const { validateHasPermissionsInput } = require('../../validation/policies/hasPermissions');

module.exports = createPolicyFactory(
  (actions, { hasAtLeastOne = false } = {}) => (ctx, next) => {
    const {
      state: { userAbility, isAuthenticatedAdmin },
      params: { model },
    } = ctx;

    if (!isAuthenticatedAdmin || !userAbility) {
      return next();
    }

    const isAuthorized = hasAtLeastOne
      ? actions.some(action => userAbility.can(action, model))
      : actions.every(action => userAbility.can(action, model));

    if (!isAuthorized) {
      throw strapi.errors.forbidden();
    }

    return next();
  },
  {
    validator: validateHasPermissionsInput,
    name: 'plugins::content-manager.hasPermissions',
  }
);
