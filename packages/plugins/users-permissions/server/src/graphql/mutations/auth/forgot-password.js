'use strict';

const { toPlainObject } = require('lodash/fp');

const { checkBadRequest } = require('../../utils');
const { createRateLimitRunner } = require('./rate-limit');

module.exports = ({ nexus, strapi }) => {
  const { nonNull } = nexus;
  const runRateLimit = createRateLimitRunner(strapi, '/auth/forgot-password');

  return {
    type: 'UsersPermissionsPasswordPayload',

    args: {
      email: nonNull('String'),
    },

    description: 'Request a reset password token',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      const output = await runRateLimit(koaContext, { body: toPlainObject(args) }, (ctx) =>
        strapi.plugin('users-permissions').controller('auth').forgotPassword(ctx)
      );

      checkBadRequest(output);

      return {
        ok: output.ok || output,
      };
    },
  };
};
