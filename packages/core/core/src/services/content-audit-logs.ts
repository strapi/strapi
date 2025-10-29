import { isEqual } from 'lodash';
import type { Model } from '@strapi/database';
import type { Core } from '@strapi/types';

type LogAction = 'create' | 'update' | 'delete';

type DiffEntry = {
  before: unknown;
  after: unknown;
};

export interface ContentAuditLogPayload {
  id: string;
  contentType: string;
  recordId: string;
  action: LogAction;
  timestamp: string;
  userId: string | null;
  payload: unknown | null;
  diff: Record<string, DiffEntry> | null;
}

export interface LogCreateInput {
  uid: string;
  recordId: string | number;
  userId: string | number | null | undefined;
  entry: unknown;
}

export interface LogUpdateInput {
  uid: string;
  recordId: string | number;
  userId: string | number | null | undefined;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface LogDeleteInput {
  uid: string;
  recordId: string | number;
  userId: string | number | null | undefined;
  entry: unknown;
}

export interface FindLogsParams {
  where?: Record<string, unknown>;
  offset?: number;
  limit?: number;
  orderBy?: Record<string, 'asc' | 'desc'>[];
}

export interface FindLogsResult {
  results: ContentAuditLogPayload[];
  total: number;
}

const AUDIT_LOG_MODEL_UID = 'strapi::audit-log';

export const auditLogModel: Model = {
  uid: AUDIT_LOG_MODEL_UID,
  singularName: 'audit_log',
  tableName: 'audit_logs',
  attributes: {
    id: {
      type: 'increments',
    },
    contentType: {
      type: 'string',
    },
    recordId: {
      type: 'string',
    },
    action: {
      type: 'string',
    },
    timestamp: {
      type: 'datetime',
    },
    userId: {
      type: 'string',
    },
    payload: {
      type: 'json',
    },
    diff: {
      type: 'json',
    },
  },
  indexes: [
    {
      name: 'audit_logs_content_type_idx',
      columns: ['content_type'],
    },
    {
      name: 'audit_logs_user_idx',
      columns: ['user_id'],
    },
    {
      name: 'audit_logs_action_idx',
      columns: ['action'],
    },
    {
      name: 'audit_logs_timestamp_idx',
      columns: ['timestamp'],
    },
  ],
};

const toStorageId = (value: string | number | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === 'string' ? value : value.toString();
};

const computeFlatDiff = (
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): Record<string, DiffEntry> => {
  const diff: Record<string, DiffEntry> = {};

  const beforeKeys = before ? Object.keys(before) : [];
  const afterKeys = after ? Object.keys(after) : [];
  const keys = new Set([...beforeKeys, ...afterKeys]);

  for (const key of keys) {
    const prevVal = before ? before[key] : undefined;
    const nextVal = after ? after[key] : undefined;

    if (!isEqual(prevVal, nextVal)) {
      diff[key] = { before: prevVal ?? null, after: nextVal ?? null };
    }
  }

  return diff;
};

const getConfig = (strapi: Core.Strapi) => {
  const cfg = (strapi.config.get('auditLog') ?? {}) as {
    enabled?: boolean;
    excludeContentTypes?: string[];
  };

  return {
    enabled: cfg.enabled ?? true,
    excludeContentTypes: cfg.excludeContentTypes ?? [],
  };
};

const shouldLog = (strapi: Core.Strapi, uid: string) => {
  const { enabled, excludeContentTypes } = getConfig(strapi);

  if (!enabled) {
    return false;
  }

  return !excludeContentTypes.includes(uid);
};

const createContentAuditLogsService = (strapi: Core.Strapi) => {
  const { db } = strapi;

  const insertLog = async ({
    uid,
    recordId,
    userId,
    action,
    payload,
    diff,
  }: {
    uid: string;
    recordId: string | number;
    userId: string | number | null | undefined;
    action: LogAction;
    payload: unknown | null;
    diff: Record<string, DiffEntry> | null;
  }) => {
    if (!shouldLog(strapi, uid)) {
      return;
    }

    await db.query(AUDIT_LOG_MODEL_UID).create({
      data: {
        contentType: uid,
        recordId: toStorageId(recordId) ?? '',
        action,
        timestamp: new Date(),
        userId: toStorageId(userId),
        payload,
        diff,
      },
    });
  };

  return {
    modelUID: AUDIT_LOG_MODEL_UID,
    async logCreate({ uid, recordId, userId, entry }: LogCreateInput) {
      await insertLog({
        uid,
        recordId,
        userId,
        action: 'create',
        payload: entry ?? null,
        diff: null,
      });
    },

    async logUpdate({ uid, recordId, userId, before, after }: LogUpdateInput) {
      const diff = computeFlatDiff(before, after);

      await insertLog({
        uid,
        recordId,
        userId,
        action: 'update',
        payload: null,
        diff: Object.keys(diff).length > 0 ? diff : null,
      });
    },

    async logDelete({ uid, recordId, userId, entry }: LogDeleteInput) {
      await insertLog({
        uid,
        recordId,
        userId,
        action: 'delete',
        payload: entry ?? null,
        diff: null,
      });
    },

    async find({ where = {}, offset = 0, limit = 20, orderBy = [] }: FindLogsParams) {
      const [entities, total] = await db.query(AUDIT_LOG_MODEL_UID).findWithCount({
        where,
        offset,
        limit,
        orderBy,
      });

      const results = entities.map((entity: any) => ({
        id: entity.id?.toString() ?? '',
        contentType: entity.contentType,
        recordId: entity.recordId,
        action: entity.action as LogAction,
        timestamp: entity.timestamp instanceof Date ? entity.timestamp.toISOString() : entity.timestamp,
        userId: entity.userId,
        payload: entity.payload ?? null,
        diff: entity.diff ?? null,
      }));

      return { results, total } as FindLogsResult;
    },
  };
};

export { createContentAuditLogsService };
