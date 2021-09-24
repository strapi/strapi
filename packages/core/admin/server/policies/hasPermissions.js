'use strict';

const _ = require('lodash');
const {
  policy: { createPolicyFactory },
} = require('@strapi/utils');
const { validateHasPermissionsInput } = require('../validation/policies/hasPermissions');

const inputModifiers = [
  {
    check: _.isString,
    transform: action => ({ action }),
  },
  {
    check: _.isArray,
    transform: arr => ({ action: arr[0], subject: arr[1] }),
  },
  {
    // Has to be after the isArray check since _.isObject also matches arrays
    check: _.isObject,
    transform: perm => perm,
  },
];

module.exports = createPolicyFactory(
  options => {
    const { actions } = options;

    const permissions = actions.map(action =>
      inputModifiers.find(modifier => modifier.check(action)).transform(action)
    );

    return ({ ctx, strapi }) => {
      const { userAbility: ability, isAuthenticated } = ctx.state;

      if (!isAuthenticated || !ability) {
        return true;
      }

      const isAuthorized = permissions.every(({ action, subject }) => ability.can(action, subject));

      if (!isAuthorized) {
        throw strapi.errors.forbidden();
      }

      return true;
    };
  },
  {
    validator: validateHasPermissionsInput,
    name: 'admin::hasPermissions',
  }
);
