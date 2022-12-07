'use strict';

const { toPlainObject } = require('lodash/fp');

const usersPermissionsRoleUID = 'plugin::users-permissions.role';

module.exports = ({ t, strapi }) => {
  const { getContentTypeInputName } = strapi.plugin('graphql').service('utils').naming;
  const roleContentType = strapi.getModel(usersPermissionsRoleUID);

  const roleInputName = getContentTypeInputName(roleContentType);

  return {
    type: 'UsersPermissionsCreateRolePayload',

    args: {
      data: t.arg({ type: roleInputName, nullable: false }),
    },

    description: 'Create a new role',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      koaContext.request.body = toPlainObject(args.data);

      await strapi.plugin('users-permissions').controller('role').createRole(koaContext);

      return { ok: true };
    },
  };
};
