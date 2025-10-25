import { Core } from '@strapi/types';

// Audit Log Policies - Handles permission-based access control for audit log endpoints
module.exports = {
  // Policy to check if user has read_audit_logs permission
  async canReadAuditLogs(ctx: any, next: any) {
    const { user } = ctx.state;

    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    // Check if user has the read_audit_logs permission
    const hasPermission = await strapi
      .service('plugin::users-permissions.permission')
      .getUserPermissions(user.id)
      .then((permissions: any) => {
        return permissions.some((permission: any) => 
          permission.action === 'plugin::audit-log.read_audit_logs'
        );
      })
      .catch(() => false);

    if (!hasPermission) {
      return ctx.forbidden('Insufficient permissions to read audit logs');
    }

    await next();
  },

  // Policy to check if user has write_audit_logs permission
  async canWriteAuditLogs(ctx: any, next: any) {
    const { user } = ctx.state;

    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    // Check if user has the write_audit_logs permission
    const hasPermission = await strapi
      .service('plugin::users-permissions.permission')
      .getUserPermissions(user.id)
      .then((permissions: any) => {
        return permissions.some((permission: any) => 
          permission.action === 'plugin::audit-log.write_audit_logs'
        );
      })
      .catch(() => false);

    if (!hasPermission) {
      return ctx.forbidden('Insufficient permissions to write audit logs');
    }

    await next();
  },

  /**
   * Policy to check if user has admin_audit_logs permission
   */
  async canAdminAuditLogs(ctx: any, next: any) {
    const { user } = ctx.state;

    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    // Check if user has the admin_audit_logs permission
    const hasPermission = await strapi
      .service('plugin::users-permissions.permission')
      .getUserPermissions(user.id)
      .then((permissions: any) => {
        return permissions.some((permission: any) => 
          permission.action === 'plugin::audit-log.admin_audit_logs'
        );
      })
      .catch(() => false);

    if (!hasPermission) {
      return ctx.forbidden('Insufficient permissions to administer audit logs');
    }

    await next();
  },

  // Policy to check if audit logging is enabled
  async isAuditLoggingEnabled(ctx: any, next: any) {
    const isEnabled = strapi.config.get('auditLog.enabled', true);
    
    if (!isEnabled) {
      return ctx.serviceUnavailable('Audit logging is currently disabled');
    }

    await next();
  },

  // Policy to check if content type is excluded from logging
  async isContentTypeAllowed(ctx: any, next: any) {
    const { contentType } = ctx.params;
    const excludedTypes = strapi.config.get('auditLog.excludeContentTypes', []);
    
    if (excludedTypes.includes(contentType)) {
      return ctx.badRequest(`Content type '${contentType}' is excluded from audit logging`);
    }

    await next();
  }
};
