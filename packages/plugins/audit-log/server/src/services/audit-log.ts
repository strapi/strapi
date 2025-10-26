import type { Core } from '@strapi/types';
import { createId } from '@paralleldrive/cuid2';

const auditLogService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async createLog({ contentType, recordId, action, ctx, before, after }: any) {
    const config = strapi.plugin('audit-log').config;
    if (!config('enabled', true)) return null;

    const excludeList: string[] = config('excludeContentTypes', []);
    if (excludeList.includes(contentType) || contentType === 'plugin::audit-log.audit-log') {
      return null;
    }

    try {
      const entry = {
        contentType,
        recordId: String(recordId),
        action,
        timestamp: new Date(),
        correlationId: this.getCorrelationId(ctx),
        userId: ctx?.state?.user?.id,
        payload: this.buildPayload(action, before, after),
        metadata: this.buildMetadata(ctx),
      };

      return await strapi.documents('plugin::audit-log.audit-log').create({ data: entry });
    } catch (error) {
      strapi.log.error('Audit log creation failed:', error);
      return null;
    }
  },

  buildPayload(action: string, before?: any, after?: any) {
    const payload: any = {};
    if (action === 'create') payload.after = after;
    if (action === 'delete') payload.before = before;
    if (action === 'update') {
      payload.before = before;
      payload.after = after;
      if (before && after) payload.changed = this.getChangedFields(before, after);
    }
    return payload;
  },

  getChangedFields(before: any, after: any): string[] {
    const changed: string[] = [];
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    
    for (const key of allKeys) {
      if (['id', 'createdAt', 'updatedAt', 'publishedAt'].includes(key)) continue;
      if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
        changed.push(key);
      }
    }
    return changed;
  },

  buildMetadata(ctx?: any) {
    if (!ctx) return {};
    return {
      ip: ctx.request?.ip,
      userAgent: ctx.request?.headers?.['user-agent'],
      userName: ctx.state?.user?.username,
      userEmail: ctx.state?.user?.email,
    };
  },

  getCorrelationId(ctx?: any): string {
    return ctx?.request?.headers?.['x-correlation-id'] || 
           ctx?.request?.headers?.['x-request-id'] || 
           createId();
  },

  async find(params: any = {}) {
    const { filters = {}, pagination = {}, sort = {} } = params;
    return await strapi.documents('plugin::audit-log.audit-log').findMany({
      filters,
      ...pagination,
      sort,
    });
  },
});

export default auditLogService;
