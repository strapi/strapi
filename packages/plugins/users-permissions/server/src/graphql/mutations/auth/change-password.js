'use strict';

const { toPlainObject } = require('lodash/fp');

const { checkBadRequest } = require('../../utils');
const { createRateLimitRunner } = require('./rate-limit');

module.exports = ({ nexus, strapi }) => {
  const { nonNull } = nexus;
  const runRateLimit = createRateLimitRunner(strapi, '/auth/change-password');

  return {
    type: 'UsersPermissionsLoginPayload',

    args: {
      currentPassword: nonNull('String'),
      password: nonNull('String'),
      passwordConfirmation: nonNull('String'),
    },

    description: 'Change user password. Confirm with the current password.',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      const output = await runRateLimit(koaContext, { body: toPlainObject(args) }, (ctx) =>
        strapi.plugin('users-permissions').controller('auth').changePassword(ctx)
      );

      checkBadRequest(output);

      return {
        user: output.user || output,
        jwt: output.jwt,
      };
    },
  };
};
