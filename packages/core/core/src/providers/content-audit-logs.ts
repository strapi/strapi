import type { Core } from '@strapi/types';
import { defineProvider } from './provider';
import { auditLogModel, createContentAuditLogsService } from '../services/content-audit-logs';
import { contentAuditLogsModule } from '../modules/content-audit-logs';

const USERS_PERMISSIONS_ROLE_UID = 'plugin::users-permissions.role';
const USERS_PERMISSIONS_PERMISSION_UID = 'plugin::users-permissions.permission';
const READ_ACTION_UID = 'read_audit_logs';

const ensurePermissionForRoles = async (strapi: Core.Strapi) => {
  if (!strapi.plugin('users-permissions')) {
    return;
  }

  const roles = await strapi.db.query(USERS_PERMISSIONS_ROLE_UID).findMany({
    populate: ['permissions'],
  });

  for (const role of roles as Array<{ id: number | string; permissions?: Array<{ action: string }> }>) {
    const alreadyExists = role.permissions?.some((permission) => permission.action === READ_ACTION_UID);

    if (!alreadyExists) {
      await strapi.db.query(USERS_PERMISSIONS_PERMISSION_UID).create({
        data: {
          action: READ_ACTION_UID,
          role: role.id,
        },
      });
    }
  }
};

export default defineProvider({
  init(strapi) {
    strapi.get('models').add(auditLogModel);
    strapi.add('content-audit-logs', () => createContentAuditLogsService(strapi));
    strapi.get('apis').add('audit-log', contentAuditLogsModule);
  },
  async register(strapi) {
    await strapi.contentAPI.permissions.providers.action.register(READ_ACTION_UID, {
      uid: READ_ACTION_UID,
      api: 'api::audit-log',
      controller: 'audit-log',
      action: 'find',
    });
  },
  async bootstrap(strapi) {
    await ensurePermissionForRoles(strapi);
  },
});
