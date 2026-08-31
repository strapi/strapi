import { toPlainObject } from 'lodash/fp';

import { checkBadRequest } from '../../utils';

export default ({ nexus, strapi }) => {
  const { nonNull } = nexus;

  return {
    type: 'UsersPermissionsPasswordPayload',

    args: {
      email: nonNull('String'),
    },

    description: 'Request a reset password token',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      koaContext.request.body = toPlainObject(args);

      await strapi.plugin('users-permissions').controller('auth').forgotPassword(koaContext);

      const output = koaContext.body;

      checkBadRequest(output);

      return {
        ok: output.ok || output,
      };
    },
  };
};
