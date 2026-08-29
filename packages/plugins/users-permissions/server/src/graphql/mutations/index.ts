import createRole from './crud/role/create-role';
import updateRole from './crud/role/update-role';
import deleteRole from './crud/role/delete-role';
import createUser from './crud/user/create-user';
import updateUser from './crud/user/update-user';
import deleteUser from './crud/user/delete-user';
import login from './auth/login';
import register from './auth/register';
import forgotPassword from './auth/forgot-password';
import resetPassword from './auth/reset-password';
import changePassword from './auth/change-password';
import emailConfirmation from './auth/email-confirmation';

const userUID = 'plugin::users-permissions.user';
const roleUID = 'plugin::users-permissions.role';

export default (context) => {
  const { nexus, strapi } = context;

  const { naming } = strapi.plugin('graphql').service('utils');

  const user = strapi.getModel(userUID);
  const role = strapi.getModel(roleUID);

  const mutations = {
    // CRUD (user & role)
    [naming.getCreateMutationTypeName(role)]: createRole,
    [naming.getUpdateMutationTypeName(role)]: updateRole,
    [naming.getDeleteMutationTypeName(role)]: deleteRole,
    [naming.getCreateMutationTypeName(user)]: createUser,
    [naming.getUpdateMutationTypeName(user)]: updateUser,
    [naming.getDeleteMutationTypeName(user)]: deleteUser,

    // Other mutations
    login,
    register,
    forgotPassword,
    resetPassword,
    changePassword,
    emailConfirmation,
  };

  return nexus.extendType({
    type: 'Mutation',

    definition(t) {
      for (const [name, getConfig] of Object.entries(mutations)) {
        const config = getConfig(context);

        t.field(name, config);
      }
    },
  });
};
