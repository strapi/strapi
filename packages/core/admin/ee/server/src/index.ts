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
import { auditLog } from './audit-logs/content-types/audit-log';
import aiRoutes from './ai/routes/ai';
import aiController from './ai/controllers/ai';
import type { Core } from '@strapi/types';
import { createAIAdminService } from './ai/containers/ai';

const getAdminEE = () => {
  const eeAdmin = {
    register,
    bootstrap,
    destroy,
    contentTypes: {
      // Always register the audit-log content type to prevent data loss
      'audit-log': auditLog,
      ...adminContentTypes,
    },
    services,
    controllers,
    routes,
  };

  const isAuditLogsEnabled =
    strapi.config.get('admin.auditLogs.enabled', true) &&
    strapi.ee.features.isEnabled('audit-logs');
  return {
    ...eeAdmin,
    controllers: {
      ...eeAdmin.controllers,
      ...(isAuditLogsEnabled ? { 'audit-logs': auditLogsController } : {}),
      ai: aiController,
    },
    routes: {
      ...eeAdmin.routes,
      ...(isAuditLogsEnabled ? { 'audit-logs': auditLogsRoutes } : {}),
      ai: aiRoutes,
    },
    async register({ strapi }: { strapi: Core.Strapi }) {
      // Run the default registration
      await eeAdmin.register({ strapi });

      // Register the real admin service; isEnabled() on the service handles the guard
      strapi.add('ai.admin', () => createAIAdminService({ strapi }));

      if (isAuditLogsEnabled) {
        // Register an internal audit logs service
        strapi.add('audit-logs', createAuditLogsService(strapi));
        // Register an internal audit logs lifecycle service
        const auditLogsLifecycle = createAuditLogsLifecycleService(strapi);
        strapi.add('audit-logs-lifecycle', auditLogsLifecycle);

        await auditLogsLifecycle.register();
      }
    },
    async destroy({ strapi }: { strapi: Core.Strapi }) {
      if (isAuditLogsEnabled) {
        strapi.get('audit-logs-lifecycle').destroy();
      }
      await eeAdmin.destroy({ strapi });
    },
  };
};

export default getAdminEE;
