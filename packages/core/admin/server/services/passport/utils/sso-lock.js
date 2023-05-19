'use strict';

const isSsoLocked = async (user) => {
  if (!strapi.EE || !user) {
    // TODO: we should be calling strapi.features.isEnabled("sso") but that's EE code. Should we load it dynamically when EE is enabled? Or add EE code to override this strategy?
    return false;
  }

  // TODO: if user object has roles === undefined, we need to query for it. [] should be fine, it means we got the roles object but they don't have any

  const adminStore = await strapi.store({ type: 'core', name: 'admin' });
  const { providers } = await adminStore.get({ key: 'auth' });
  const lockedRoles = providers.authenticationDisabled || [];

  // Check for roles that have blocked
  const isLocked = lockedRoles.some((lockedId) =>
    // lockedRoles will be a string to avoid issues with frontend and bigints
    user.roles?.some((role) => lockedId === role.id.toString())
  );

  return isLocked;
};

const userPopulateForSso = () => {
  if (!strapi.EE) {
    // TODO: we should be calling strapi.features.isEnabled("sso") but that's EE code. Should we load it dynamically when EE is enabled? Or add EE code to override this strategy?
    return undefined;
  }

  return ['roles'];
};

module.exports = {
  isSsoLocked,
  userPopulateForSso,
};
