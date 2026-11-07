export interface DatabaseQueryTelemetryInfo {
  durationMs: number;
  requestId?: string;
  /** True when this query emitted a `query.slow` or `query.error` performance event */
  slowOrErrorEventEmitted: boolean;
}

export interface DatabasePerformanceConfig {
  enabled?: boolean;
  slowQueryMs?: number;
  sampleRate?: number;
  captureSqlText?: boolean;
  captureBindings?: boolean;
  /** Optional ALS / context hook injected by runtime (e.g. Strapi) for HTTP correlation */
  getRequestId?: () => string | undefined;
  notifyQueryTelemetry?: (info: DatabaseQueryTelemetryInfo) => void;
}

/**
 * Raw Knex query lifecycle event payload (emitted on `query` / `query-response` / `query-error`).
 * Shared so DB perf listeners and OpenTelemetry tracing both avoid `any`.
 */
export interface KnexQueryEvent {
  __knexQueryUid?: string;
  sql?: string;
  method?: string;
  bindings?: unknown[];
  queryContext?: { requestId?: string; [key: string]: unknown };
}

/** Per-query state tracked between the `query` event and its terminal response/error event. */
export interface InflightQueryState {
  startedAt: number;
  sql?: string;
  bindings?: unknown[];
  method?: string;
  requestId?: string;
}

export interface DatabaseQueryPerfEvent {
  type: 'query.slow' | 'query.error';
  timestamp: string;
  durationMs: number;
  dbClient: string;
  queryFingerprint: string;
  queryType: 'select' | 'insert' | 'update' | 'delete' | 'other';
  requestId?: string;
  success: boolean;
  errorCode?: string;
  sql?: string;
  bindings?: unknown[];
}

export type DatabasePerformanceSubscriber = (event: DatabaseQueryPerfEvent) => void | Promise<void>;

export type DatabaseResolvedPerformanceConfig = Required<
  Omit<DatabasePerformanceConfig, 'getRequestId' | 'notifyQueryTelemetry'>
>;

export const DEFAULT_DATABASE_PERFORMANCE_CONFIG: DatabaseResolvedPerformanceConfig = {
  enabled: false,
  slowQueryMs: 100,
  sampleRate: 1,
  captureSqlText: false,
  captureBindings: false,
};

const NUMBER_LITERAL_REGEX = /\b\d+(?:\.\d+)?\b/g;
const SINGLE_QUOTED_LITERAL_REGEX = /'([^'\\]|\\.)*'/g;
/** Knex Postgres bindings (`$1`, `$2`, …) before they are collapsed with `?`. */
const POSTGRES_BINDING_REGEX = /\$\d+/g;
/**
 * One `IN` list is one query shape. Runs after literals and bindings are `?`,
 * so `IN (1, 2)` and `IN ($1, $2, $3)` both become `in (?)`.
 */
const IN_LIST_REGEX = /\bin\s*\(\s*\?(?:\s*,\s*\?)*\s*\)/gi;

/**
 * Stable SQL shape for grouping. Double quotes and backticks are identifiers
 * (Postgres, SQLite, MySQL), so they stay. Only single-quoted strings, numeric
 * literals, and `$n` bindings are replaced.
 */
export const normalizeSqlFingerprint = (sql?: string) => {
  if (!sql) {
    return 'unknown';
  }

  return sql
    .replace(SINGLE_QUOTED_LITERAL_REGEX, '?')
    .replace(POSTGRES_BINDING_REGEX, '?')
    .replace(NUMBER_LITERAL_REGEX, '?')
    .replace(IN_LIST_REGEX, 'in (?)')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

export const toQueryType = (method?: string): DatabaseQueryPerfEvent['queryType'] => {
  switch ((method ?? '').toLowerCase()) {
    case 'select':
    case 'insert':
    case 'update':
    case 'delete':
      return method!.toLowerCase() as DatabaseQueryPerfEvent['queryType'];
    default:
      return 'other';
  }
};
