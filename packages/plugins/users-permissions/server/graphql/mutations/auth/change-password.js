'use strict';

const { toPlainObject } = require('lodash/fp');

const { checkBadRequest } = require('../../utils');

module.exports = ({ t, strapi }) => {
  return {
    type: 'UsersPermissionsLoginPayload',

    args: {
      currentPassword: t.arg({ type: 'String', nullable: false }),
      password: t.arg({ type: 'String', nullable: false }),
      passwordConfirmation: t.arg({ type: 'String', nullable: false }),
    },

    description: 'Change user password. Confirm with the current password.',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      koaContext.request.body = toPlainObject(args);

      await strapi.plugin('users-permissions').controller('auth').changePassword(koaContext);

      const output = koaContext.body;

      checkBadRequest(output);

      return {
        user: output.user || output,
        jwt: output.jwt,
      };
    },
  };
};
