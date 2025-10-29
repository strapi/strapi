import type { Core } from '@strapi/types';

const contentApiRoutes: Core.Router = {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'audit-log.find',
      info: {
        apiName: 'audit-log',
      },
      config: {
        auth: {
          scope: ['read_audit_logs'],
        },
      },
    },
  ],
};

export { contentApiRoutes };
