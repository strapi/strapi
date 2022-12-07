'use strict';

const { toPlainObject } = require('lodash/fp');

const { checkBadRequest } = require('../../utils');

module.exports = ({ t, strapi }) => {
  return {
    type: 'UsersPermissionsLoginPayload',
    nullable: false,

    args: {
      input: t.arg({ type: 'UsersPermissionsRegisterInput', nullable: false }),
    },

    description: 'Register a user',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      koaContext.request.body = toPlainObject(args.input);

      await strapi.plugin('users-permissions').controller('auth').register(koaContext);

      const output = koaContext.body;

      checkBadRequest(output);

      return {
        user: output.user || output,
        jwt: output.jwt,
      };
    },
  };
};
