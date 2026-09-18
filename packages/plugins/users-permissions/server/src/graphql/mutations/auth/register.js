'use strict';

const { toPlainObject } = require('lodash/fp');

const { checkBadRequest } = require('../../utils');
const { createRateLimitRunner } = require('./rate-limit');

module.exports = ({ nexus, strapi }) => {
  const { nonNull } = nexus;
  const runRateLimit = createRateLimitRunner(strapi, '/auth/local/register');

  return {
    type: nonNull('UsersPermissionsLoginPayload'),

    args: {
      input: nonNull('UsersPermissionsRegisterInput'),
    },

    description: 'Register a user',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      const output = await runRateLimit(koaContext, { body: toPlainObject(args.input) }, (ctx) =>
        strapi.plugin('users-permissions').controller('auth').register(ctx)
      );

      checkBadRequest(output);

      return {
        user: output.user || output,
        jwt: output.jwt,
      };
    },
  };
};
