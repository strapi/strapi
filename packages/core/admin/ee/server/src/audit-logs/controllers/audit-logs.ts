import { createGzip } from 'zlib';

import type { Context } from 'koa';
import { errors } from '@strapi/utils';

import {
  AUDIT_LOGS_EXPORT_CURSOR_DONE,
  AUDIT_LOGS_EXPORT_NEXT_CURSOR_HEADER,
  AUDIT_LOGS_EXPORT_PART_SIZE_HEADER,
  AUDIT_LOGS_EXPORT_TOKEN_HEADER,
  AUDIT_LOGS_EXPORT_UNTIL_HEADER,
} from '../../../../../shared/utils/audit-log-export';
import { validateExport, validateFindMany, validateFindManyUsers } from '../validation/audit-logs';

const EXPORT_INVALID_CONTINUATION_MESSAGE =
  'The export continuation is invalid or has expired. Restart the export.';
const EXPORT_TOO_LARGE_MESSAGE =
  'The export matches more entries than the configured limit. Add filters to reduce it.';

export default {
  async findMany(ctx: Context) {
    const { query } = ctx.request;
    await validateFindMany(query);

    const auditLogs = strapi.get('audit-logs');
    const body = await auditLogs.findMany(query);

    ctx.body = body;
  },

  async findManyUsers(ctx: Context) {
    const { query } = ctx.request;
    const { page, pageSize } = await validateFindManyUsers(query);

    const auditLogs = strapi.get('audit-logs');
    const body = await auditLogs.findManyUsers({ page, pageSize });

    ctx.body = body;
  },

  async findOne(ctx: Context) {
    const { id } = ctx.params;

    const auditLogs = strapi.get('audit-logs');
    const body = await auditLogs.findOne(id);

    ctx.body = body;

    strapi.telemetry.send('didWatchAnAuditLog');
  },

  async export(ctx: Context) {
    const { query } = ctx.request;
    const validatedQuery = await validateExport(query);

    const auditLogs = strapi.get('audit-logs');

    const isContinuation = validatedQuery.cursor !== undefined;

    if (isContinuation && !auditLogs.isTrustedContinuation(validatedQuery)) {
      throw new errors.ValidationError(EXPORT_INVALID_CONTINUATION_MESSAGE);
    }

    if (!isContinuation) {
      if (await auditLogs.isExportTooLarge({ filters: validatedQuery.filters ?? null })) {
        throw new errors.PayloadTooLargeError(EXPORT_TOO_LARGE_MESSAGE);
      }
    }

    const { stream, nextCursor, until, isNewExport, partSize, exportToken } =
      await auditLogs.createExportStream(validatedQuery);

    const date = new Date().toISOString().slice(0, 10);

    ctx.set('Content-Type', 'text/csv; charset=utf-8');
    ctx.set('Content-Disposition', `attachment; filename="audit-logs-${date}.csv"`);
    ctx.set(AUDIT_LOGS_EXPORT_UNTIL_HEADER, String(until));
    ctx.set(AUDIT_LOGS_EXPORT_PART_SIZE_HEADER, String(partSize));
    ctx.set(AUDIT_LOGS_EXPORT_TOKEN_HEADER, exportToken);
    ctx.set(
      AUDIT_LOGS_EXPORT_NEXT_CURSOR_HEADER,
      nextCursor !== null ? String(nextCursor) : AUDIT_LOGS_EXPORT_CURSOR_DONE
    );

    const exposedHeaders = [
      ctx.response.get('Access-Control-Expose-Headers'),
      AUDIT_LOGS_EXPORT_UNTIL_HEADER,
      AUDIT_LOGS_EXPORT_NEXT_CURSOR_HEADER,
      AUDIT_LOGS_EXPORT_PART_SIZE_HEADER,
      AUDIT_LOGS_EXPORT_TOKEN_HEADER,
      'Content-Disposition',
    ]
      .filter(Boolean)
      .join(', ');
    ctx.set('Access-Control-Expose-Headers', exposedHeaders);

    ctx.vary('Accept-Encoding');
    if (ctx.acceptsEncodings('gzip', 'identity') === 'gzip') {
      ctx.set('Content-Encoding', 'gzip');
      const gzip = createGzip();
      stream.on('error', (error: Error) => gzip.destroy(error));
      ctx.body = stream.pipe(gzip);
    } else {
      ctx.body = stream;
    }

    if (isNewExport) {
      strapi.telemetry.send('didExportAuditLogs');
    }
  },
};
