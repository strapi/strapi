'use strict';

const _ = require('lodash');

const createUtils = (strapi) => {
  const login = async (userInfo) => {
    const sanitizedUserInfo = _.pick(userInfo, ['email', 'id']);
    const user = await strapi.query('admin::user').findOne({ where: sanitizedUserInfo });
    if (!user) {
      throw new Error('User not found');
    }
    const token = strapi.admin.services.token.createJwtToken(user);

    return { token, user };
  };

  const findUser = strapi.admin.services.user.findOne;
  const userExists = strapi.admin.services.user.exists;
  const createUser = async (userInfo) => {
    const superAdminRole = await strapi.admin.services.role.getSuperAdminWithUsersCount();

    if (superAdminRole.usersCount === 0) {
      const userRoles = _.uniq((userInfo.roles || []).concat(superAdminRole.id));
      Object.assign(userInfo, { roles: userRoles });
    }

    return strapi.admin.services.user.create({
      registrationToken: null,
      isActive: true,
      ...userInfo,
    });
  };
  const deleteUserById = strapi.admin.services.user.deleteById;
  const deleteUsersById = strapi.admin.services.user.deleteByIds;
  const createUserIfNotExists = async (userInfo) => {
    const sanitizedUserInfo = _.pick(userInfo, ['email', 'id']);
    const exists = await userExists(sanitizedUserInfo);

    return !exists ? createUser(userInfo) : null;
  };

  const registerOrLogin = async (userCredentials) => {
    await createUserIfNotExists(userCredentials);
    return login(userCredentials);
  };

  const createRole = strapi.admin.services.role.create;
  const getRole = strapi.admin.services.role.find;
  const deleteRolesById = strapi.admin.services.role.deleteByIds;
  const getSuperAdminRole = strapi.admin.services.role.getSuperAdmin;
  const assignPermissionsToRole = strapi.admin.services.role.assignPermissions;

  return {
    // Auth
    login,
    registerOrLogin,
    // Users
    findUser,
    createUser,
    createUserIfNotExists,
    userExists,
    deleteUserById,
    deleteUsersById,
    // Roles
    getRole,
    getSuperAdminRole,
    createRole,
    deleteRolesById,
    assignPermissionsToRole,
  };
};

module.exports = { createUtils };
