'use strict';

const { toPlainObject } = require('lodash/fp');

const { checkBadRequest } = require('../../utils');

module.exports = ({ nexus, strapi }) => {
  const { nonNull } = nexus;

  return {
    type: 'UsersPermissionsMultiFactorAuthenticationInput',

    args: {
      code: nonNull('String'),
    },

    description: 'Enter the two-factor code sent to the email',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      koaContext.request.body = toPlainObject(args);

      await strapi.plugin('users-permissions').controller('auth').multiFactorAuthentication(koaContext);

      const output = koaContext.body;

      checkBadRequest(output);

      return {
        ok: output.ok || output,
      };
    },
  };
};
