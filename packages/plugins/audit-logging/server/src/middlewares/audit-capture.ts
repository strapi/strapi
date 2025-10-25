import type { Core } from '@strapi/types';
import { getService, isLoggingEnabledForContentType } from '../utils';
import { prepareAuditEntryData } from '../utils/metadata';

/**
 * Audit capture middleware that integrates with Strapi's document service
 * to automatically log all content operations
 */
export const createAuditCaptureMiddleware = ({ strapi }: { strapi: Core.Strapi }) => {
  return async (context: any, next: () => Promise<any>) => {
    const { uid: contentType, action, params } = context;

    // Skip if audit logging is not enabled for this content type
    if (!isLoggingEnabledForContentType(strapi, contentType)) {
      return next();
    }

    // Only capture create, update, and delete operations
    if (!['create', 'update', 'delete'].includes(action)) {
      return next();
    }

    let oldData: any = null;

    // For update and delete operations, fetch the existing data
    if ((action === 'update' || action === 'delete') && params?.documentId) {
      try {
        oldData = await strapi.documents(contentType).findOne({
          documentId: params.documentId,
          locale: params.locale,
          status: params.status,
        });
      } catch (error) {
        strapi.log.warn('Failed to fetch existing data for audit logging', {
          contentType,
          documentId: params.documentId,
          error: error.message,
        });
      }
    }

    // Execute the original operation
    const result = await next();

    // Create audit log entry asynchronously to avoid blocking the operation
    setImmediate(async () => {
      try {
        const auditLogService = getService('audit-log', { strapi });
        
        let recordId: string;
        let newData: any = null;

        // Extract record ID and new data based on operation type
        switch (action) {
          case 'create':
            recordId = result?.documentId || result?.id;
            newData = result;
            break;
          case 'update':
            recordId = params?.documentId || result?.documentId || result?.id;
            newData = result;
            break;
          case 'delete':
            recordId = params?.documentId || oldData?.documentId || oldData?.id;
            break;
          default:
            return; // Skip unsupported actions
        }

        if (!recordId) {
          strapi.log.warn('Could not determine record ID for audit logging', {
            contentType,
            action,
            params,
          });
          return;
        }

        // Get request context for metadata extraction
        const ctx = strapi.requestContext?.get?.();

        // Prepare audit entry data
        const auditEntryData = prepareAuditEntryData(strapi, {
          contentType,
          recordId,
          action,
          oldData,
          newData,
          ctx,
        });

        // Create the audit log entry
        await auditLogService.createAuditEntry(auditEntryData);

      } catch (error) {
        // Log the error but don't throw it to avoid affecting the original operation
        strapi.log.error('Failed to create audit log entry', {
          contentType,
          action,
          error: error.message,
          stack: error.stack,
        });
      }
    });

    return result;
  };
};

/**
 * Register audit capture middleware with Strapi's document service
 */
export const registerAuditCaptureMiddleware = ({ strapi }: { strapi: Core.Strapi }) => {
  const auditMiddleware = createAuditCaptureMiddleware({ strapi });
  strapi.documents.use(auditMiddleware);
  
  strapi.log.info('Audit capture middleware registered');
};