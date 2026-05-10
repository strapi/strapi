import type { DatabaseQueryPerfEvent } from '@strapi/database';

/** Namespace version for all `performance.*` hub payloads in Strapi 5.x (additive-only within major). */
export const PERFORMANCE_PUBLIC_SCHEMA_VERSION = 1 as const;

/** Per-event payload version (increment when fields change). */
export const PERFORMANCE_DB_QUERY_SLOW_EVENT_VERSION = 1 as const;
export const PERFORMANCE_DB_QUERY_ERROR_EVENT_VERSION = 1 as const;
export const PERFORMANCE_REQUEST_SUMMARY_EVENT_VERSION = 1 as const;
export const PERFORMANCE_REQUEST_START_EVENT_VERSION = 1 as const;
export const PERFORMANCE_REQUEST_STAGE_EVENT_VERSION = 1 as const;

export const PERFORMANCE_HUB_EVENT_NAMES = [
  'performance.db.query.slow',
  'performance.db.query.error',
  'performance.request.start',
  'performance.request.stage',
  'performance.request.summary',
] as const;

export type PerformanceHubEventName = (typeof PERFORMANCE_HUB_EVENT_NAMES)[number];

export type PublicDatabaseQueryPerformancePayload = DatabaseQueryPerfEvent & {
  schemaVersion: typeof PERFORMANCE_PUBLIC_SCHEMA_VERSION;
  eventVersion:
    | typeof PERFORMANCE_DB_QUERY_SLOW_EVENT_VERSION
    | typeof PERFORMANCE_DB_QUERY_ERROR_EVENT_VERSION;
};

export type PublicRequestPerfStage =
  | 'middleware'
  | 'auth'
  | 'policy'
  | 'controller'
  | 'service'
  | 'sanitize'
  | 'validate'
  | 'other';

export interface PublicRequestStartPayload {
  schemaVersion: typeof PERFORMANCE_PUBLIC_SCHEMA_VERSION;
  eventVersion: typeof PERFORMANCE_REQUEST_START_EVENT_VERSION;
  requestId: string;
  method: string;
  /** Raw path; route template may be unknown before routing. */
  path: string;
}

export interface PublicRequestStagePayload {
  schemaVersion: typeof PERFORMANCE_PUBLIC_SCHEMA_VERSION;
  eventVersion: typeof PERFORMANCE_REQUEST_STAGE_EVENT_VERSION;
  requestId: string;
  stage: PublicRequestPerfStage;
  stageDurationMs: number;
}

export interface PublicRequestSummaryPayload {
  schemaVersion: typeof PERFORMANCE_PUBLIC_SCHEMA_VERSION;
  eventVersion: typeof PERFORMANCE_REQUEST_SUMMARY_EVENT_VERSION;
  requestId: string;
  durationMs: number;
  method: string;
  /** Matched route pattern when available (e.g. from `@koa/router`); falls back to raw path. */
  route: string;
  /** Raw path segment (may have higher cardinality than `route`). */
  path: string;
  statusCode: number;
  dbQueryCount: number;
  dbTotalMs: number;
  /** Count of slow or failed DB queries recorded for this request (spec field name). */
  slowQueryCount: number;
  /**
   * @deprecated Use `slowQueryCount`. Retained for backward compatibility with earlier payloads.
   */
  slowOrErrorQueryEvents: number;
}

export function buildPublicDatabaseQueryPerformancePayload(
  hubEventName: 'performance.db.query.slow' | 'performance.db.query.error',
  event: DatabaseQueryPerfEvent
): PublicDatabaseQueryPerformancePayload {
  const eventVersion =
    hubEventName === 'performance.db.query.error'
      ? PERFORMANCE_DB_QUERY_ERROR_EVENT_VERSION
      : PERFORMANCE_DB_QUERY_SLOW_EVENT_VERSION;

  return {
    schemaVersion: PERFORMANCE_PUBLIC_SCHEMA_VERSION,
    eventVersion,
    ...event,
  };
}

export function buildPublicRequestSummaryPayload(
  fields: Omit<
    PublicRequestSummaryPayload,
    'schemaVersion' | 'eventVersion' | 'slowOrErrorQueryEvents' | 'slowQueryCount'
  > & { slowQueryCount: number }
): PublicRequestSummaryPayload {
  return {
    schemaVersion: PERFORMANCE_PUBLIC_SCHEMA_VERSION,
    eventVersion: PERFORMANCE_REQUEST_SUMMARY_EVENT_VERSION,
    ...fields,
    slowOrErrorQueryEvents: fields.slowQueryCount,
  };
}

export function buildPublicRequestStartPayload(
  fields: Omit<PublicRequestStartPayload, 'schemaVersion' | 'eventVersion'>
): PublicRequestStartPayload {
  return {
    schemaVersion: PERFORMANCE_PUBLIC_SCHEMA_VERSION,
    eventVersion: PERFORMANCE_REQUEST_START_EVENT_VERSION,
    ...fields,
  };
}

export function buildPublicRequestStagePayload(
  fields: Omit<PublicRequestStagePayload, 'schemaVersion' | 'eventVersion'>
): PublicRequestStagePayload {
  return {
    schemaVersion: PERFORMANCE_PUBLIC_SCHEMA_VERSION,
    eventVersion: PERFORMANCE_REQUEST_STAGE_EVENT_VERSION,
    ...fields,
  };
}
