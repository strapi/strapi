'use strict';

const userUID = 'plugin::users-permissions.user';
const roleUID = 'plugin::users-permissions.role';

module.exports = (context) => {
  const { builder, strapi } = context;

  const { naming } = strapi.plugin('graphql').service('utils');

  const user = strapi.getModel(userUID);
  const role = strapi.getModel(roleUID);

  const mutations = {
    // CRUD (user & role)
    [naming.getCreateMutationTypeName(role)]: require('./crud/role/create-role'),
    [naming.getUpdateMutationTypeName(role)]: require('./crud/role/update-role'),
    [naming.getDeleteMutationTypeName(role)]: require('./crud/role/delete-role'),
    [naming.getCreateMutationTypeName(user)]: require('./crud/user/create-user'),
    [naming.getUpdateMutationTypeName(user)]: require('./crud/user/update-user'),
    [naming.getDeleteMutationTypeName(user)]: require('./crud/user/delete-user'),

    // Other mutations
    login: require('./auth/login'),
    register: require('./auth/register'),
    forgotPassword: require('./auth/forgot-password'),
    resetPassword: require('./auth/reset-password'),
    changePassword: require('./auth/change-password'),
    emailConfirmation: require('./auth/email-confirmation'),
  };

  return builder.mutationFields((t) => {
    const fieldsObj = {};

    for (const [name, getConfig] of Object.entries(mutations)) {
      const config = getConfig({ ...context, t });

      fieldsObj[name] = t.field(config);
    }

    return fieldsObj;
  });
};
