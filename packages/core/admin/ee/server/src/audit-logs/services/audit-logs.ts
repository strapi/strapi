import { Readable } from 'stream';

import type { Core } from '@strapi/types';

import {
  AUDIT_LOG_EXPORT_EVENT,
  AUDIT_LOGS_EXPORT_DEFAULT_MAX_ROWS,
  AUDIT_LOGS_EXPORT_PART_MAX_ROWS,
  AUDIT_LOGS_EXPORT_PART_ROWS,
} from '../../../../../shared/utils/audit-log-export';
import { getDisplayName } from '../utils';
import { CSV_BOM, serializeCsvLine } from '../utils/csv';
import { signExportToken, verifyExportToken } from '../utils/export-token';

const EXPORT_CSV_COLUMNS = [
  'id',
  'action',
  'date',
  'user_id',
  'user_email',
  'user_display_name',
  'origin',
  'payload',
];
const EXPORT_USER_COLUMNS = ['id', 'email', 'username', 'firstname', 'lastname'];
const EXPORT_BATCH_SIZE = 5000;

interface Event {
  action: string;
  date: Date;
  // Null for actions no person performed, such as a scheduled job
  userId: string | number | null;
  payload: Record<string, unknown>;
}

interface Log extends Omit<Event, 'userId'> {
  user: string | number | null;
}

const getSanitizedUser = (user: any) => {
  return {
    id: user.id,
    email: user.email,
    displayName: getDisplayName(user),
  };
};

const serializeCsvPayload = (payload: unknown) => {
  if (payload === null || payload === undefined) {
    return null;
  }

  return typeof payload === 'string' ? payload : JSON.stringify(payload);
};

const parseCsvPayload = (payload: unknown): Record<string, unknown> | null => {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  return typeof payload === 'object' ? (payload as Record<string, unknown> | null) : null;
};

interface ExportQuery {
  cursor?: number;
  pageSize?: number;
  until?: number;
  token?: string;
  [key: string]: unknown;
}

const getExportSecret = (strapi: Core.Strapi): string => {
  const secret = strapi.config.get('admin.auth.secret');

  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error(
      'The audit logs export requires admin.auth.secret to be set in config/admin.js.'
    );
  }

  return secret;
};

const isTrustedExportContinuation = (strapi: Core.Strapi, query: ExportQuery) => {
  return (
    query.cursor !== undefined &&
    query.until !== undefined &&
    verifyExportToken(getExportSecret(strapi), query.token, query.until, query.filters)
  );
};

const buildExportWhere = (filtersWhere: unknown, untilId: number, afterId: number) => ({
  $and: [
    filtersWhere ?? {},
    { id: { $lte: untilId } },
    ...(afterId > 0 ? [{ id: { $gt: afterId } }] : []),
  ],
});

const toCsvLine = (row: any) => {
  const user = row.user ? getSanitizedUser(row.user) : null;
  const { payload } = row;

  return serializeCsvLine([
    row.id,
    row.action,
    row.date instanceof Date ? row.date.toISOString() : row.date,
    user?.id ?? null,
    user?.email ?? null,
    user?.displayName ?? null,
    parseCsvPayload(payload)?.origin ?? null,
    serializeCsvPayload(payload),
  ]);
};

/**
 * @description
 * Manages audit logs interaction with the database. Accessible via strapi.get('audit-logs')
 */
const createAuditLogsService = (strapi: Core.Strapi) => {
  return {
    async saveEvent(event: Event) {
      const { userId, ...rest } = event;

      const auditLog: Log = { ...rest, user: userId };

      // Save to database
      await strapi.db.query('admin::audit-log').create({ data: auditLog });

      return this;
    },

    async findMany(query: unknown) {
      // NOTE: We get the IDs first because sorting full rows runs MySQL/MariaDB out of sort memory
      // See: https://github.com/strapi/strapi/issues/27399
      const { results: logRows, pagination } = await strapi.db.query('admin::audit-log').findPage({
        ...strapi.get('query-params').transform('admin::audit-log', query),
        select: ['id'],
      });

      const ids = logRows.map((log) => log.id);
      const logs = ids.length
        ? await strapi.db.query('admin::audit-log').findMany({
            where: { id: { $in: ids } },
            populate: ['user'],
            select: ['action', 'date', 'payload'],
          })
        : [];
      const logsById = new Map(logs.map((log) => [log.id, log]));
      const results = ids.map((id) => logsById.get(id)).filter(Boolean);

      const sanitizedResults = results.map((result: any) => {
        const { user, ...rest } = result;
        return {
          ...rest,
          user: user ? getSanitizedUser(user) : null,
        };
      });

      return {
        results: sanitizedResults,
        pagination,
      };
    },

    async isExportTooLarge(query: { filters?: unknown }) {
      const maxRows = strapi.config.get(
        'admin.auditLogs.exportMaxRows',
        AUDIT_LOGS_EXPORT_DEFAULT_MAX_ROWS
      );
      const { where } = strapi
        .get('query-params')
        .transform('admin::audit-log', { filters: query.filters ?? undefined });

      const beyondCap = await strapi.db.query('admin::audit-log').findMany({
        select: ['id'],
        where: where ?? {},
        orderBy: { id: 'asc' },
        offset: maxRows,
        limit: 1,
      });

      return beyondCap.length > 0;
    },

    isTrustedContinuation(query: ExportQuery) {
      return isTrustedExportContinuation(strapi, query);
    },

    async createExportStream(query: ExportQuery) {
      getExportSecret(strapi);

      const { cursor, pageSize, until, token, page: _page, sort: _sort, ...filtersQuery } = query;

      const configuredPartSize = strapi.config.get(
        'admin.auditLogs.exportPartRows',
        AUDIT_LOGS_EXPORT_PART_ROWS
      );
      const partSize = Math.max(
        1,
        Math.min(pageSize ?? configuredPartSize, AUDIT_LOGS_EXPORT_PART_MAX_ROWS)
      );

      const { where: filtersWhere } = strapi
        .get('query-params')
        .transform('admin::audit-log', filtersQuery);

      const isNewExport = !isTrustedExportContinuation(strapi, query);
      if (isNewExport) {
        await strapi.eventHub.emit(AUDIT_LOG_EXPORT_EVENT, {
          filters: filtersQuery.filters ?? null,
        });
      }

      let frozenUntil = isNewExport ? undefined : until;
      if (frozenUntil === undefined) {
        const [lastRow] = await strapi.db.query('admin::audit-log').findMany({
          select: ['id'],
          orderBy: { id: 'desc' },
          limit: 1,
        });

        frozenUntil = lastRow?.id ?? 0;
      }

      const untilId = frozenUntil ?? 0;
      const getWhere = (afterId: number) => buildExportWhere(filtersWhere, untilId, afterId);

      const boundary: Array<{ id: number }> = await strapi.db.query('admin::audit-log').findMany({
        select: ['id'],
        where: getWhere(cursor ?? 0),
        orderBy: { id: 'asc' },
        offset: partSize - 1,
        limit: 2,
      });

      const nextCursor = boundary.length > 1 ? boundary[0].id : null;

      const partUpperBound = nextCursor ?? untilId;

      async function* csvChunks() {
        if (isNewExport) {
          yield CSV_BOM + serializeCsvLine(EXPORT_CSV_COLUMNS);
        }

        let lastId = cursor ?? 0;
        let remaining = partSize;

        while (remaining > 0) {
          const batchLimit = Math.min(EXPORT_BATCH_SIZE, remaining);
          const rows: any[] = await strapi.db.query('admin::audit-log').findMany({
            select: ['id', 'action', 'date', 'payload'],
            populate: { user: { select: EXPORT_USER_COLUMNS } },
            where: buildExportWhere(filtersWhere, partUpperBound, lastId),
            orderBy: { id: 'asc' },
            limit: batchLimit,
          });

          if (rows.length === 0) {
            break;
          }

          yield rows.map(toCsvLine).join('');

          lastId = rows[rows.length - 1].id;
          remaining -= rows.length;

          if (rows.length < batchLimit) {
            break;
          }
        }
      }

      async function* loggedCsvChunks() {
        try {
          yield* csvChunks();
        } catch (error) {
          strapi.log.error(
            `Audit logs export failed after the response started, the CSV part is truncated: ${error}`
          );
          throw error;
        }
      }

      return {
        stream: Readable.from(loggedCsvChunks(), { objectMode: false, highWaterMark: 64 * 1024 }),
        nextCursor,
        until: untilId,
        isNewExport,
        partSize,
        exportToken: isNewExport
          ? signExportToken(getExportSecret(strapi), untilId, filtersQuery.filters)
          : (token as string),
      };
    },

    async findManyUsers(query: { page?: number | string; pageSize?: number | string }) {
      const { page = 1, pageSize = 10 } = query;

      const userAttribute = strapi.db.metadata.get('admin::audit-log').attributes.user;

      if (
        userAttribute?.type !== 'relation' ||
        !('joinTable' in userAttribute) ||
        !userAttribute.joinTable ||
        !('inverseJoinColumn' in userAttribute.joinTable)
      ) {
        throw new Error('The audit log user relation is expected to use a join table');
      }

      const { joinTable } = userAttribute;

      const authorIds = await strapi.db
        .connection(joinTable.name)
        .distinct(joinTable.inverseJoinColumn.name)
        .pluck(joinTable.inverseJoinColumn.name);

      const { results, pagination } = await strapi.db.query('admin::user').findPage({
        select: ['id', 'email', 'username', 'firstname', 'lastname'],
        where: { id: { $in: authorIds } },
        orderBy: { id: 'asc' },
        page: Number(page),
        pageSize: Number(pageSize),
      });

      return {
        results: results.map(getSanitizedUser),
        pagination,
      };
    },

    async findOne(id: unknown) {
      const result: any = await strapi.db.query('admin::audit-log').findOne({
        where: { id },
        populate: ['user'],
        select: ['action', 'date', 'payload'],
      });

      if (!result) {
        return null;
      }

      const { user, ...rest } = result;
      return {
        ...rest,
        user: user ? getSanitizedUser(user) : null,
      };
    },

    deleteExpiredEvents(expirationDate: Date) {
      return strapi.db.query('admin::audit-log').deleteMany({
        where: {
          date: {
            $lt: expirationDate.toISOString(),
          },
        },
      });
    },
  };
};

export { createAuditLogsService, toCsvLine };
