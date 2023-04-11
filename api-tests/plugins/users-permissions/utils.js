'use strict';

const createAuthenticatedUser = async ({ strapi, userInfo }) => {
  const defaultRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });

  const user = await strapi.service('plugin::users-permissions.user').add({
    role: defaultRole.id,
    ...userInfo,
  });

  const jwt = strapi.service('plugin::users-permissions.jwt').issue({ id: user.id });

  return { user, jwt };
};

module.exports = {
  createAuthenticatedUser,
};
