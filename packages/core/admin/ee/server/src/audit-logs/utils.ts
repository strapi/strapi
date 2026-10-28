import type { Core } from '@strapi/types';

interface AdminUserLike {
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  email: string;
}

/** How an admin user is named across audit logs */
const getDisplayName = (user: AdminUserLike): string => {
  if (user.username) {
    return user.username;
  }

  if (user.firstname && user.lastname) {
    return `${user.firstname} ${user.lastname}`;
  }

  return user.email;
};

/**
 * Audit logs run when the license includes the feature and the admin config does not disable them.
 * Routes, services and permission actions all follow this condition.
 */
const isAuditLogsEnabled = (strapi: Core.Strapi): boolean =>
  Boolean(
    strapi.config.get('admin.auditLogs.enabled', true) && strapi.ee.features.isEnabled('audit-logs')
  );

export { getDisplayName, isAuditLogsEnabled };
