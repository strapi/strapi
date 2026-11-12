import type { Core } from '@strapi/strapi';

type AuditLogConfig = { level?: 'info' | 'warn' };

// An optional config: typed routes accept the name alone.
export default (config: AuditLogConfig = {}): Core.MiddlewareHandler =>
  async (ctx, next) => {
    await next();
    ctx.set('X-Audit-Level', config.level ?? 'info');
  };
