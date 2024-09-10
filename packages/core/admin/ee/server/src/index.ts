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
import { Core } from '@strapi/types';

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

  // Only add the other audit-logs APIs if the feature is enabled by the user and the license
  if (
    strapi.config.get('admin.auditLogs.enabled', true) &&
    strapi.ee.features.isEnabled('audit-logs')
  ) {
    return {
      ...eeAdmin,
      controllers: {
        ...eeAdmin.controllers,
        'audit-logs': auditLogsController,
      },
      routes: {
        ...eeAdmin.routes,
        'audit-logs': auditLogsRoutes,
      },
      async register({ strapi }: { strapi: Core.Strapi }) {
        // Run the the default registration
        await eeAdmin.register({ strapi });
        // Register an internal audit logs service
        strapi.add('audit-logs', createAuditLogsService(strapi));
        // Register an internal audit logs lifecycle service
        const auditLogsLifecycle = createAuditLogsLifecycleService(strapi);
        strapi.add('audit-logs-lifecycle', auditLogsLifecycle);

        await auditLogsLifecycle.register();
      },
      async destroy({ strapi }: { strapi: Core.Strapi }) {
        strapi.get('audit-logs-lifecycle').destroy();
        await eeAdmin.destroy({ strapi });
      },
    };
  }

  return eeAdmin;
};

export default getAdminEE;
