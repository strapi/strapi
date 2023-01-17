'use strict';

const { SUPER_ADMIN_CODE } = require('../services/constants');

/**
 * Create a new user model by merging default and specified attributes
 * @param attributes A partial user object
 */
function createUser(attributes) {
  return {
    roles: [],
    isActive: false,
    username: null,
    ...attributes,
  };
}

const hasSuperAdminRole = (user) => {
  return user.roles.filter((role) => role.code === SUPER_ADMIN_CODE).length > 0;
};

module.exports = {
  createUser,
  hasSuperAdminRole,
};
