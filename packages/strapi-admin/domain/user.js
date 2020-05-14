'use strict';

/**
 * Create a new user model by merging default and specified attributes
 * @param attributes A partial user object
 */
function createUser(attributes) {
  return {
    roles: [],
    isActive: false,
    ...attributes,
  };
}

module.exports = {
  createUser,
};
