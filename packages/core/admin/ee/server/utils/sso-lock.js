'use strict';

const { features } = require('@strapi/strapi/ee');
const { isEmpty } = require('lodash/fp');

const isSsoLocked = async (user) => {
  if (!features.isEnabled('sso')) {
    return false;
  }

  if (!user) {
    throw new Error('Missing user object');
  }

  // check if any roles are locked
  const adminStore = await strapi.store({ type: 'core', name: 'admin' });
  const { providers } = await adminStore.get({ key: 'auth' });
  const lockedRoles = providers.ssoLockedRoles || [];
  if (isEmpty(lockedRoles)) {
    return false;
  }

  // Ensure we have user.roles and get them if we don't have them
  const roles =
    user.roles ||
    (await strapi.query('admin::user').load(user, 'roles', { roles: { fields: ['id'] } }));

  // Check if any of the user's roles are in lockedRoles
  const isLocked = lockedRoles.some((lockedId) =>
    // lockedRoles will be a string to avoid issues with frontend and bigints
    roles?.some((role) => lockedId === role.id.toString())
  );

  return isLocked;
};

module.exports = {
  isSsoLocked,
};
