// Compile-only assertions. The EE server tsconfig includes this file; declaration builds exclude it.
import type { Context } from 'koa';
import type { Core } from '@strapi/types';
import type { createAuditLogsService } from '../audit-logs/services/audit-logs';

type AuditLogsService = ReturnType<typeof createAuditLogsService>;

declare const auditLogs: AuditLogsService;
declare const queryParams: Core.QueryParamsService;
declare const ctx: Context;

// `findMany` passes its query to `strapi.get('query-params').transform`.
export const transformFindManyQuery = (query: Parameters<AuditLogsService['findMany']>[0]) =>
  queryParams.transform('admin::audit-log', query);

// The controller passes the request query string to `findMany`.
auditLogs.findMany(ctx.request.query);

// The lifecycles service saves the events it builds, dated with `new Date().toISOString()`.
auditLogs.saveEvent({
  action: 'entry.create',
  date: new Date().toISOString(),
  userId: null,
  payload: {},
});
