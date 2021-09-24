'use strict';

const {
  policy: { createPolicyFactory },
} = require('@strapi/utils');
const { validateHasPermissionsInput } = require('../validation/policies/hasPermissions');

module.exports = createPolicyFactory(
  ({ actions = [], hasAtLeastOne = false } = {}) => ({ ctx, strapi }) => {
    const {
      state: { userAbility, isAuthenticatedAdmin },
      params: { model },
    } = ctx;

    if (!isAuthenticatedAdmin || !userAbility) {
      return true;
    }

    const isAuthorized = hasAtLeastOne
      ? actions.some(action => userAbility.can(action, model))
      : actions.every(action => userAbility.can(action, model));

    if (!isAuthorized) {
      throw strapi.errors.forbidden();
    }

    return true;
  },
  {
    validator: validateHasPermissionsInput,
    name: 'plugin::content-manager.hasPermissions',
  }
);
