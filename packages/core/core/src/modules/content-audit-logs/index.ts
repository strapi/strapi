import type { RawModule } from '../../domain/module';
import { contentApiRoutes } from './routes';
import { auditLogController } from './controller';

const contentAuditLogsModule: RawModule = {
  routes: {
    'content-api': contentApiRoutes,
  },
  controllers: {
    'audit-log': auditLogController,
  },
};

export { contentAuditLogsModule };
