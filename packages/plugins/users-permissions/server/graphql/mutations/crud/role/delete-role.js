'use strict';

module.exports = ({ t, strapi }) => {
  return {
    type: 'UsersPermissionsDeleteRolePayload',

    args: {
      id: t.arg({ type: 'ID', nullable: false }),
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
