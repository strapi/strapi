import { Core } from '@strapi/types';

// Content API Audit Middleware - Intercepts Content API requests to automatically log audit entries
module.exports = (config: any, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: any) => {
    if (!ctx.path.startsWith('/api/') || ctx.path.includes('/audit-logs')) {
      return next();
    }

    const startTime = Date.now();
    let originalData = null;
    let requestId = null;

    try {
      requestId = ctx.get('x-request-id') || ctx.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      ctx.set('x-request-id', requestId);

      // Store request context for audit service
      if (strapi.requestContext) {
        (strapi.requestContext as any).set('request', ctx.request);
        (strapi.requestContext as any).set('state', ctx.state);
      }

      const pathParts = ctx.path.split('/').filter(Boolean);
      const isContentApi = pathParts[0] === 'api';
      
      if (isContentApi && pathParts.length >= 2) {
        const contentType = pathParts[1];
        const recordId = pathParts[2];
        
        const isEnabled = strapi.config.get('auditLog.enabled', true);
        if (!isEnabled) {
          return next();
        }

        const excludedTypes = strapi.config.get('auditLog.excludeContentTypes', []);
        if (excludedTypes.includes(contentType)) {
          return next();
        }

        const allowedActions = strapi.config.get('auditLog.logLevels', ['create', 'update', 'delete']);
        
        let action = null;
        let isEntityOperation = false;

        switch (ctx.method) {
          case 'POST':
            if (pathParts.length === 2) {
              action = 'create';
              isEntityOperation = true;
            }
            break;
          case 'PUT':
          case 'PATCH':
            if (pathParts.length === 3) {
              action = 'update';
              isEntityOperation = true;
            }
            break;
          case 'DELETE':
            if (pathParts.length === 3) {
              action = 'delete';
              isEntityOperation = true;
            }
            break;
        }

        if (isEntityOperation && (action === 'update' || action === 'delete')) {
          try {
            const entity = await strapi.entityService.findOne(`api::${contentType}.${contentType}`, recordId, {
              populate: '*'
            });
            if (entity) {
              originalData = { ...entity };
            }
          } catch (error: any) {
            strapi.log.debug(`Could not fetch original data for audit log: ${error.message}`);
          }
        }

        if (action && !allowedActions.includes(action)) {
          return next();
        }

        ctx.auditContext = {
          contentType,
          recordId,
          action,
          originalData,
          requestId,
          startTime
        };
      }

      await next();

      if (ctx.auditContext && ctx.status < 400) {
        const { contentType, recordId, action, originalData } = ctx.auditContext;
        
        if (action && contentType) {
          let fullPayload = null;
          let changedFields: string[] = [];

          if (action === 'create' || action === 'update') {
            fullPayload = ctx.body?.data || ctx.body;
          }

          if (action === 'update' && originalData && fullPayload) {
            const excludedFields = strapi.config.get('auditLog.excludedFields', [
              'id', 'documentId', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'
            ]);
            
            changedFields = Object.keys(fullPayload).filter(key => {
              if (excludedFields.includes(key)) return false;
              return JSON.stringify(originalData[key]) !== JSON.stringify(fullPayload[key]);
            });
          }

          await strapi.service('plugin::audit-log.audit-log').logContentApiOperation({
            contentType,
            recordId,
            action,
            user: ctx.state.user,
            changedFields,
            fullPayload,
            previousData: originalData,
            ipAddress: ctx.ip || ctx.request.ip,
            userAgent: ctx.get('user-agent'),
            requestId,
            metadata: {
              method: ctx.method,
              path: ctx.path,
              statusCode: ctx.status,
              responseTime: Date.now() - startTime,
              timestamp: new Date().toISOString()
            }
          });
        }
      }

    } catch (error: any) {
      if (ctx.auditContext) {
        const { contentType, recordId, action, originalData } = ctx.auditContext;
        
        if (action && contentType) {
          await strapi.service('plugin::audit-log.audit-log').logContentApiOperation({
            contentType,
            recordId,
            action,
            user: ctx.state.user,
            changedFields: [],
            fullPayload: null,
            previousData: originalData,
            ipAddress: ctx.ip || ctx.request.ip,
            userAgent: ctx.get('user-agent'),
            requestId,
            metadata: {
              method: ctx.method,
              path: ctx.path,
              statusCode: ctx.status,
              error: error.message,
              responseTime: Date.now() - startTime,
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      throw error;
    }
  };
};
