/**
 * Canonical `performance.*` event hub names. Single source of truth for subscribers,
 * artifacts, bridges, and public capability lists.
 */
export const PERFORMANCE_HUB_EVENT = {
  DB_QUERY_SLOW: 'performance.db.query.slow',
  DB_QUERY_ERROR: 'performance.db.query.error',
  REQUEST_START: 'performance.request.start',
  REQUEST_STAGE: 'performance.request.stage',
  REQUEST_SUMMARY: 'performance.request.summary',
} as const;

export type PerformanceHubDbQueryEventName =
  | typeof PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW
  | typeof PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR;

export const PERFORMANCE_HUB_EVENT_NAMES = [
  PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW,
  PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR,
  PERFORMANCE_HUB_EVENT.REQUEST_START,
  PERFORMANCE_HUB_EVENT.REQUEST_STAGE,
  PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY,
] as const;

export type PerformanceHubBuiltInEventName = (typeof PERFORMANCE_HUB_EVENT_NAMES)[number];

/** Request-scoped hub events included in performance artifact batches. */
export const PERFORMANCE_ARTIFACT_REQUEST_EVENTS = [
  PERFORMANCE_HUB_EVENT.REQUEST_START,
  PERFORMANCE_HUB_EVENT.REQUEST_STAGE,
  PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY,
] as const;
