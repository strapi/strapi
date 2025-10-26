'use strict';

module.exports = async (policyContext, config, { strapi }) => {
  const { userAbility } = policyContext.state.admin;
  const { permission } = config;

  if (userAbility.can(permission)) {
    return true; // User can proceed
  }

  return false; // Forbidden
};
