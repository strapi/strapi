'use strict';

const userUID = 'plugin::users-permissions.user';
const roleUID = 'plugin::users-permissions.role';

module.exports = ({ strapi }) => {
  const { naming } = strapi.plugin('graphql').service('utils');

  const user = strapi.getModel(userUID);
  const role = strapi.getModel(roleUID);

  const createRole = naming.getCreateMutationTypeName(role);
  const updateRole = naming.getUpdateMutationTypeName(role);
  const deleteRole = naming.getDeleteMutationTypeName(role);
  const createUser = naming.getCreateMutationTypeName(user);
  const updateUser = naming.getUpdateMutationTypeName(user);
  const deleteUser = naming.getDeleteMutationTypeName(user);

  return {
    // Disabled auth for some operations
    'Mutation.login': { auth: false },
    'Mutation.register': { auth: false },
    'Mutation.forgotPassword': { auth: false },
    'Mutation.resetPassword': { auth: false },
    'Mutation.emailConfirmation': { auth: false },
    'Mutation.changePassword': {
      auth: {
        scope: 'plugin::users-permissions.auth.changePassword',
      },
    },

    // Scoped auth for replaced CRUD operations
    // Role
    [`Mutation.${createRole}`]: { auth: { scope: [`${roleUID}.createRole`] } },
    [`Mutation.${updateRole}`]: { auth: { scope: [`${roleUID}.updateRole`] } },
    [`Mutation.${deleteRole}`]: { auth: { scope: [`${roleUID}.deleteRole`] } },
    // User
    [`Mutation.${createUser}`]: { auth: { scope: [`${userUID}.create`] } },
    [`Mutation.${updateUser}`]: { auth: { scope: [`${userUID}.update`] } },
    [`Mutation.${deleteUser}`]: { auth: { scope: [`${userUID}.destroy`] } },
  };
};
