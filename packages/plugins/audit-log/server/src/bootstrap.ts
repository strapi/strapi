import type { Core } from '@strapi/types';

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info('[audit-log] Starting bootstrap...');
  
  // Register permissions
  strapi.log.info('[audit-log] Registering permissions...');
  await strapi.service('admin::permission').actionProvider.registerMany([
    {
      section: 'plugins',
      displayName: 'Read',
      uid: 'read',
      pluginName: 'audit-log',
    },
  ]);
  strapi.log.info('[audit-log] Permissions registered successfully');

  // Use document service middleware to capture create/update/delete/publish actions
  strapi.log.info('[audit-log] Setting up document middleware...');
  strapi.documents.use(async (context, next) => {
    const action = context.action;
    const contentType = context.uid;
    
    // Only track these actions
    if (!['create', 'update', 'delete', 'publish', 'unpublish'].includes(action)) {
      return next();
    }

    // Get before state for update/delete
    let before = null;
    if (['update', 'delete', 'unpublish'].includes(action) && (context.params as any)?.documentId) {
      try {
        before = await strapi.documents(contentType as any).findOne({
          documentId: (context.params as any).documentId,
        });
      } catch (err) {
        // Continue without before state
      }
    }

    // Execute the action
    const result = await next();
    
    // Get request context
    const ctx = strapi.requestContext.get();

    // Create audit log
    try {
      await strapi.plugin('audit-log').service('audit-log').createLog({
        contentType,
        recordId: (result as any)?.documentId || (result as any)?.id,
        action,
        ctx,
        before,
        after: result,
      });
    } catch (err) {
      // Log error but don't fail the request
      strapi.log.error('[audit-log] Failed to create audit log:', err);
    }

    return result;
  });
  strapi.log.info('[audit-log] Document middleware registered successfully');

  strapi.log.info('[audit-log] Plugin loaded successfully');
};

export default bootstrap;
