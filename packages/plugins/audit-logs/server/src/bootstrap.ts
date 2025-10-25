import type { Core } from '@strapi/types';
import { getService, isAuditingEnabled, isContentTypeExcluded, getUserInfo, getConfig } from './utils';

const registerLifecycleHooks = () => {
  // Subscribe to all model lifecycle events
  strapi.db.lifecycles.subscribe(async (event) => {
    // Check if auditing is enabled
    if (!isAuditingEnabled()) {
      return;
    }

    const { action, model, result, params } = event;
    const contentType = model?.uid;

    // Skip if content type is excluded
    if (!contentType || isContentTypeExcluded(contentType)) {
      return;
    }

    // Skip internal or system content types
    if (
      contentType.startsWith('admin::') ||
      contentType.startsWith('strapi::') ||
      contentType === 'plugin::upload.file' ||
      contentType === 'plugin::upload.folder'
    ) {
      return;
    }

    const auditLogsService = getService('audit-logs');
    
    // Get user info from the current context (if available)
    // Note: In lifecycle hooks, we don't always have access to ctx
    // We'll try to get it from strapi's request context
    let userInfo = { userId: null, userName: null, userEmail: null };
    try {
      const ctx = strapi.requestContext?.get();
      if (ctx) {
        userInfo = getUserInfo(ctx);
      }
    } catch (e) {
      // Context not available, proceed with null user info
    }

    try {
      switch (action) {
        case 'afterCreate':
          if (result) {
            await auditLogsService.logCreate(
              contentType,
              result.id || result.documentId,
              result,
              userInfo
            );
          }
          break;

        case 'afterUpdate':
          if (result && params?.where?.id) {
            // Fetch the previous data
            const previousData = await strapi.db
              .query(contentType)
              .findOne({ where: params.where });

            await auditLogsService.logUpdate(
              contentType,
              result.id || result.documentId,
              previousData,
              result,
              userInfo
            );
          }
          break;

        case 'afterDelete':
          if (params?.where?.id) {
            // Fetch the data before deletion (if still available in params)
            const deletedData = event.state || result || params.where;
            
            await auditLogsService.logDelete(
              contentType,
              params.where.id,
              deletedData,
              userInfo
            );
          }
          break;
      }
    } catch (error) {
      strapi.log.error(`Failed to create audit log for ${action} on ${contentType}:`, error);
      // Don't throw - audit logging should not break the main operation
    }
  });
};

const registerDocumentServiceMiddleware = () => {
  // Intercept document service actions for better context
  strapi.documents.use(async (context, next) => {
    // Check if auditing is enabled
    if (!isAuditingEnabled()) {
      return next();
    }

    const { uid: contentType, action } = context;

    // Skip if content type is excluded
    if (isContentTypeExcluded(contentType)) {
      return next();
    }

    // Skip internal or system content types
    if (
      contentType.startsWith('admin::') ||
      contentType.startsWith('strapi::') ||
      contentType === 'plugin::upload.file' ||
      contentType === 'plugin::upload.folder'
    ) {
      return next();
    }

    const auditLogsService = getService('audit-logs');

    // Get user info
    let userInfo = { userId: null, userName: null, userEmail: null };
    try {
      const ctx = strapi.requestContext?.get();
      if (ctx) {
        userInfo = getUserInfo(ctx);
      }
    } catch (e) {
      // Context not available
    }

    // Store previous data for updates
    let previousData = null;
    if (action === 'update' && (context as any).documentId) {
      try {
        previousData = await strapi.documents(contentType).findOne({
          documentId: (context as any).documentId,
        });
      } catch (e) {
        // Could not fetch previous data
      }
    }

    // Execute the action
    const result = await next();

    // Log the action
    try {
      // Extract ID from result safely
      const getRecordId = (data: any): string | null => {
        if (!data) return null;
        if (typeof data === 'object') {
          return data.documentId || data.id || null;
        }
        return null;
      };

      const recordId = getRecordId(result);

      switch (action) {
        case 'create':
          if (result && recordId) {
            await auditLogsService.logCreate(
              contentType,
              recordId,
              result,
              userInfo
            );
          }
          break;

        case 'update':
          if (result && previousData && recordId) {
            await auditLogsService.logUpdate(
              contentType,
              recordId,
              previousData,
              result,
              userInfo
            );
          }
          break;

        case 'delete':
          const deleteId = (context as any).documentId || recordId;
          if (deleteId) {
            await auditLogsService.logDelete(
              contentType,
              deleteId,
              previousData || {},
              userInfo
            );
          }
          break;

        case 'publish':
          if (result && recordId) {
            await auditLogsService.logPublish(
              contentType,
              recordId,
              result,
              userInfo
            );
          }
          break;

        case 'unpublish':
          if (result && recordId) {
            await auditLogsService.logUnpublish(
              contentType,
              recordId,
              result,
              userInfo
            );
          }
          break;
      }
    } catch (error) {
      strapi.log.error(`Failed to create audit log for ${action} on ${contentType}:`, error);
      // Don't throw - audit logging should not break the main operation
    }

    return result;
  });
};

const setupCleanupCron = () => {
  const config = getConfig();
  
  if (config.retentionDays && config.retentionDays > 0) {
    // Run cleanup daily at 2 AM
    strapi.cron.add({
      'audit-logs-cleanup': {
        task: async () => {
          strapi.log.info('Running audit logs cleanup...');
          const auditLogsService = getService('audit-logs');
          await auditLogsService.cleanup(config.retentionDays);
        },
        options: {
          rule: '0 2 * * *', // Run at 2:00 AM every day
        },
      },
    });
  }
};

export default async () => {
  // Register lifecycle hooks
  registerLifecycleHooks();

  // Register document service middleware for better context
  registerDocumentServiceMiddleware();

  // Setup cleanup cron job
  setupCleanupCron();
  
  // CRITICAL FIX: Add middleware to intercept audit-logs requests BEFORE admin catch-all
  strapi.server.use(async (ctx, next) => {
    const path = ctx.path;
    
    // Check if this is an audit-logs request
    if (path.startsWith('/admin/audit-logs')) {
      console.log('🔍 [INTERCEPTOR] Caught request:', path, ctx.method);
      
      // Extract the route part after /admin/audit-logs
      const subPath = path.replace('/admin/audit-logs', '') || '/';
      
      // Get the controller
      const controller = strapi.plugin('audit-logs').controller('audit-logs');
      
      try {
        // Route to the appropriate handler
        if (subPath === '/' && ctx.method === 'GET') {
          console.log('🔍 [INTERCEPTOR] Routing to find()');
          return await controller.find(ctx, () => Promise.resolve());
        } else if (subPath === '/stats' && ctx.method === 'GET') {
          console.log('🔍 [INTERCEPTOR] Routing to stats()');
          return await controller.stats(ctx, () => Promise.resolve());
        } else if (subPath.match(/^\/[^\/]+$/) && ctx.method === 'GET') {
          console.log('🔍 [INTERCEPTOR] Routing to findOne()');
          return await controller.findOne(ctx, () => Promise.resolve());
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('🔍 [INTERCEPTOR] Error:', message);
        ctx.status = 500;
        ctx.body = { error: message };
        return;
      }
    }
    
    await next();
  });

  strapi.log.info('Audit Logs plugin initialized');
};

