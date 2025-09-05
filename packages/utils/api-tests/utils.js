'use strict';

const _ = require('lodash');

const createUtils = (strapi) => {
  const login = async (userInfo) => {
    const sanitizedUserInfo = _.pick(userInfo, ['email', 'password']);

    // Perform HTTP login to obtain access token using the session manager
    const agent = require('supertest').agent(strapi.server.httpServer);
    const res = await agent.post('/admin/login').type('application/json').send(sanitizedUserInfo);

    if (res.statusCode !== 200) {
      throw new Error(`Admin login failed: ${res.statusCode}`);
    }

    const token = res.body?.data?.token;
    if (!token) {
      throw new Error('Admin login did not return an access token');
    }

    // Retrieve the current user via API to mirror real client flow
    const me = await agent.get('/admin/users/me').auth(token, { type: 'bearer' });
    if (me.statusCode !== 200) {
      throw new Error(`Fetching /admin/users/me failed: ${me.statusCode}`);
    }

    return { token, user: me.body?.data };
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
