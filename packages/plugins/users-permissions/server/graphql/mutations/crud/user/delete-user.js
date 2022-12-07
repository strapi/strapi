'use strict';

const { checkBadRequest } = require('../../../utils');

const usersPermissionsUserUID = 'plugin::users-permissions.user';

module.exports = ({ t, strapi }) => {
  const { getEntityResponseName } = strapi.plugin('graphql').service('utils').naming;

  const userContentType = strapi.getModel(usersPermissionsUserUID);

  const responseName = getEntityResponseName(userContentType);

  return {
    type: responseName,
    nullable: false,

    args: {
      id: t.arg({ type: 'ID', nullable: false }),
    },

    description: 'Delete an existing user',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      koaContext.params = { id: args.id };

      await strapi.plugin('users-permissions').controller('user').destroy(koaContext);

      checkBadRequest(koaContext.body);

      return {
        value: koaContext.body,
        info: { args, resourceUID: 'plugin::users-permissions.user' },
      };
    },
  };
};
