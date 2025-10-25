import type { Core } from '@strapi/types';
import { getService } from './utils';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  console.log('Audit Logs permissions registered');
  
  // Register permissions
  const actions = [
    {
      section: 'plugins',
      displayName: 'Read',
      uid: 'read',
      pluginName: 'audit-logs',
    },
  ];

  strapi.admin.services.permission.actionProvider.registerMany(actions);
  
  // CRITICAL FIX: Register routes directly to the main router to bypass admin catch-all
  // Do this synchronously in register phase
  setTimeout(() => {
    console.log('🔍 [REGISTER] Registering audit-logs routes directly to main router');
    
    try {
      // Register specific routes that will match BEFORE the admin/:path* catch-all
      strapi.server.router.get('/admin/audit-logs', async (ctx) => {
        console.log('🔍 [DIRECT ROUTE] Handling /admin/audit-logs');
        const auditLogsService = getService('audit-logs');
        const result = await auditLogsService.find({
          page: 1,
          pageSize: 25,
        });
        ctx.type = 'application/json';
        ctx.body = {
          data: result.results,
          meta: { pagination: result.pagination },
        };
      });
      
      strapi.server.router.get('/admin/audit-logs/stats', async (ctx) => {
        console.log('🔍 [DIRECT ROUTE] Handling /admin/audit-logs/stats');
        const auditLogsService = getService('audit-logs');
        const stats = await auditLogsService.getStats();
        ctx.type = 'application/json';
        ctx.body = { data: stats };
      });
      
      console.log('🔍 [REGISTER] Direct routes registered successfully');
    } catch (error) {
      console.error('🔍 [REGISTER] Error registering direct routes:', error);
    }
  }, 100);
};
