export interface DatabasePerformanceConfig {
  enabled?: boolean;
  slowQueryMs?: number;
  sampleRate?: number;
  captureSqlText?: boolean;
  captureBindings?: boolean;
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

export const DEFAULT_DATABASE_PERFORMANCE_CONFIG: Required<DatabasePerformanceConfig> = {
  enabled: false,
  slowQueryMs: 100,
  sampleRate: 1,
  captureSqlText: false,
  captureBindings: false,
};

const NUMBER_LITERAL_REGEX = /\b\d+(?:\.\d+)?\b/g;
const SINGLE_QUOTED_LITERAL_REGEX = /'([^'\\]|\\.)*'/g;
const DOUBLE_QUOTED_LITERAL_REGEX = /"([^"\\]|\\.)*"/g;

export const normalizeSqlFingerprint = (sql?: string) => {
  if (!sql) {
    return 'unknown';
  }

  return sql
    .replace(SINGLE_QUOTED_LITERAL_REGEX, '?')
    .replace(DOUBLE_QUOTED_LITERAL_REGEX, '?')
    .replace(NUMBER_LITERAL_REGEX, '?')
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
