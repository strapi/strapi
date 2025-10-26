import type { Core } from '@strapi/strapi';

/**
 * Policy to check if user has permission to read audit logs
 */
export default (policyContext, config, { strapi }: { strapi: Core.Strapi }) => {
  const { userAbility } = policyContext.state;

  // Check if user is authenticated
  if (!policyContext.state.user) {
    return false;
  }

  // Check if user has the specific permission to read audit logs
  const canReadAuditLogs = userAbility.can('plugin::audit-log.read');

  if (!canReadAuditLogs) {
    strapi.log.warn(
      `User ${policyContext.state.user.id} attempted to access audit logs without permission`
    );
    return false;
  }

  return true;
};

