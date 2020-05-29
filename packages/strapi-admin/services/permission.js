'use strict';

/**
 * Delete permissions of roles in database
 * @param params ids of roles
 * @returns {Promise<array>}
 */
const deleteByRolesIds = rolesIds => {
  return strapi.query('permission', 'admin').delete({ role_in: rolesIds });
};

module.exports = {
  deleteByRolesIds,
};
