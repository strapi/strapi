'use strict';

const { toPlainObject } = require('lodash/fp');

const { checkBadRequest } = require('../../utils');
const { createRateLimitRunner } = require('./rate-limit');

module.exports = ({ nexus, strapi }) => {
  const { nonNull } = nexus;
  const runRateLimit = createRateLimitRunner(strapi, '/auth/reset-password');

  return {
    type: 'UsersPermissionsLoginPayload',

    args: {
      password: nonNull('String'),
      passwordConfirmation: nonNull('String'),
      code: nonNull('String'),
    },

    description: 'Reset user password. Confirm with a code (resetToken from forgotPassword)',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      const output = await runRateLimit(koaContext, { body: toPlainObject(args) }, (ctx) =>
        strapi.plugin('users-permissions').controller('auth').resetPassword(ctx)
      );

      checkBadRequest(output);

      return {
        user: output.user || output,
        jwt: output.jwt,
      };
    },
  };
};
