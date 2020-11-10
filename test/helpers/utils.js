'use strict';

// eslint-disable-next-line node/no-extraneous-require
const _ = require('lodash');

const createUtils = strapi => {
  const login = async userInfo => {

    const sanitizedUserInfo = _.pick(userInfo, ['email', 'id']);
    const user = await strapi.admin.services.user.findOne(sanitizedUserInfo);
    if (!user) {
      throw new Error('User not found');
    }
    const token = strapi.admin.services.token.createJwtToken(user);

    return { token, user };

  };
  const registerOrLogin = async userCredentials => {

    await createUserIfNotExists(userCredentials);
    return login(userCredentials);
  };

  const findUser = strapi.admin.services.user.findOne;
  const userExists = strapi.admin.services.user.exists;
  const createUser = async userInfo => {
    const superAdminRole = await strapi.admin.services.role.getSuperAdminWithUsersCount();

    if (superAdminRole.usersCount === 0) {
      Object.assign(userInfo, { roles: _.uniq((userInfo.roles || []).concat(superAdminRole.id)) });
    }

    return strapi.admin.services.user.create({
      registrationToken: null,
      isActive: true,
      ...userInfo,
    });
  };
  const deleteUserById = strapi.admin.services.user.deleteById;
  const deleteUsersById = strapi.admin.services.user.deleteByIds;
  const createUserIfNotExists = async userInfo => {
    const sanitizedUserInfo = _.pick(userInfo, ['email', 'id']);
    const exists = await userExists(sanitizedUserInfo);

    return !exists ? createUser(userInfo) : null;
  };

  const createRole = strapi.admin.services.role.create;
  const getRole = strapi.admin.services.role.find;
  const deleteRolesById = strapi.admin.services.role.deleteByIds;
  const getSuperAdminRole = strapi.admin.services.role.getSuperAdmin;


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
  }
};

module.exports = { createUtils };

