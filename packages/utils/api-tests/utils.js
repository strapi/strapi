'use strict';

const _ = require('lodash');

const createUtils = (strapi) => {
  const login = async (userInfo) => {
    const sanitizedUserInfo = _.pick(userInfo, ['email', 'id']);
    const user = await strapi.db.query('admin::user').findOne({ where: sanitizedUserInfo });
    if (!user) {
      throw new Error('User not found');
    }
    const token = strapi.service('admin::token').createJwtToken(user);

    return { token, user };
  };

  const findUser = strapi.service('admin::user').findOne;
  const userExists = strapi.service('admin::user').exists;
  const createUser = async (userInfo) => {
    const superAdminRole = await strapi.service('admin::role').getSuperAdminWithUsersCount();

    if (superAdminRole.usersCount === 0) {
      const userRoles = _.uniq((userInfo.roles || []).concat(superAdminRole.id));
      Object.assign(userInfo, { roles: userRoles });
    }

    return strapi.service('admin::user').create({
      registrationToken: null,
      isActive: true,
      ...userInfo,
    });
  };
  const deleteUserById = strapi.service('admin::user').deleteById;
  const deleteUsersById = strapi.service('admin::user').deleteByIds;
  const createUserIfNotExists = async (userInfo) => {
    const sanitizedUserInfo = _.pick(userInfo, ['email', 'id']);
    const exists = await userExists(sanitizedUserInfo);

    return !exists ? createUser(userInfo) : null;
  };

  const registerOrLogin = async (userCredentials) => {
    await createUserIfNotExists(userCredentials);
    return login(userCredentials);
  };

  const createRole = strapi.service('admin::role').create;
  const getRole = strapi.service('admin::role').find;
  const deleteRolesById = strapi.service('admin::role').deleteByIds;
  const getSuperAdminRole = strapi.service('admin::role').getSuperAdmin;
  const assignPermissionsToRole = strapi.service('admin::role').assignPermissions;

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

/**
 * Execute a test suite only if the condition is true
 * @return Jest.Describe
 */
const describeOnCondition = (bool) => (bool ? describe : describe.skip);

module.exports = {
  createUtils,
  describeOnCondition,
};
