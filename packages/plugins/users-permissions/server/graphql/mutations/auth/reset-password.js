'use strict';

const { toPlainObject } = require('lodash/fp');

const { checkBadRequest } = require('../../utils');

module.exports = ({ t, strapi }) => {
  return {
    type: 'UsersPermissionsLoginPayload',

    args: {
      password: t.arg({ type: 'String', nullable: false }),
      passwordConfirmation: t.arg({ type: 'String', nullable: false }),
      code: t.arg({ type: 'String', nullable: false }),
    },

    description: 'Reset user password. Confirm with a code (resetToken from forgotPassword)',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      koaContext.request.body = toPlainObject(args);

      await strapi.plugin('users-permissions').controller('auth').resetPassword(koaContext);

      const output = koaContext.body;

      checkBadRequest(output);

      return {
        user: output.user || output,
        jwt: output.jwt,
      };
    },
  };
};
