import type { Core } from '@strapi/types';
import register from './register';
import bootstrap from './bootstrap';
import destroy from './destroy';
import adminContentTypes from './content-types';
import services from './services';
import controllers from './controllers';
import routes from './routes';
import auditLogsRoutes from './audit-logs/routes/audit-logs';
import auditLogsController from './audit-logs/controllers/audit-logs';
import { createAuditLogsService } from './audit-logs/services/audit-logs';
import { createAuditLogsLifecycleService } from './audit-logs/services/lifecycles';
import { isAuditLogsEnabled as getIsAuditLogsEnabled } from './audit-logs/utils';
import { AUDIT_LOG_EXPORT_EVENT } from '../../../shared/utils/audit-log-export';
import { registerTokenAuditEvents } from '../../../server/src/audit-logs/tokens';
import { registerAdminUserAuditEvents } from '../../../server/src/audit-logs/admin-users';
import { registerWebhookAuditEvents } from '../../../server/src/audit-logs/webhooks';
import { registerAuthAuditEvents } from '../../../server/src/audit-logs/auth';
import { registerSsoSettingsAuditEvents } from '../../../server/src/audit-logs/sso-settings';

const getAdminEE = () => {
  const eeAdmin = {
    register,
    bootstrap,
    destroy,
    // The audit-log content type is registered by the CE admin, in every edition
    contentTypes: adminContentTypes,
    services,
    controllers,
    routes,
  };

  const isAuditLogsEnabled = getIsAuditLogsEnabled(strapi);
  return {
    ...eeAdmin,
    controllers: {
      ...eeAdmin.controllers,
      ...(isAuditLogsEnabled ? { 'audit-logs': auditLogsController } : {}),
    },
    routes: {
      ...eeAdmin.routes,
      ...(isAuditLogsEnabled ? { 'audit-logs': auditLogsRoutes } : {}),
    },
    async register({ strapi }: { strapi: Core.Strapi }) {
      // Run the default registration
      await eeAdmin.register({ strapi });

      if (isAuditLogsEnabled) {
        // Register an internal audit logs service
        strapi.add('audit-logs', createAuditLogsService(strapi));
        // Register an internal audit logs lifecycle service
        const auditLogsLifecycle = createAuditLogsLifecycleService(strapi);
        strapi.add('audit-logs-lifecycle', auditLogsLifecycle);

        auditLogsLifecycle.registerEvent(
          AUDIT_LOG_EXPORT_EVENT,
          (event: { filters?: unknown }) => ({
            resource: { type: 'audit-log' },
            details: { format: 'csv', filters: event?.filters ?? null },
          })
        );

        registerTokenAuditEvents(auditLogsLifecycle);
        registerAdminUserAuditEvents(auditLogsLifecycle);
        registerWebhookAuditEvents(auditLogsLifecycle);
        registerAuthAuditEvents(auditLogsLifecycle);
        registerSsoSettingsAuditEvents(auditLogsLifecycle);

        await auditLogsLifecycle.register();
      }
    },
    async destroy({ strapi }: { strapi: Core.Strapi }) {
      if (isAuditLogsEnabled) {
        strapi.get('audit-logs-lifecycle').destroy();
      }
      await eeAdmin.destroy();
    },
  };
};

export default getAdminEE;
