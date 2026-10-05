'use strict';

module.exports = ({ nexus, strapi }) => {
  const { nonNull } = nexus;

  return {
    type: 'UsersPermissionsDeleteRolePayload',

    args: {
      id: nonNull('ID'),
    },

    description: 'Delete an existing role',

    async resolve(parent, args, context) {
      const { koaContext } = context;

      koaContext.params = { role: args.id };

      await strapi.plugin('users-permissions').controller('role').deleteRole(koaContext);

      return { ok: true };
    },
  };
};
