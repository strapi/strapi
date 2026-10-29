import type { PerformanceWidgetTailWindow } from './performance-widget';

export type PerformanceFingerprintRow = { fingerprint: string; count: number; totalMs: number };

/** One route bucket aggregated from `performance.request.summary` rows in the artifact tail. */
export type PerformanceRouteAgg = {
  method: string;
  route: string;
  count: number;
  avgDurationMs: number;
  avgDbMs: number;
  /** Mean of min(100, dbTotalMs / durationMs * 100) per request in this bucket. */
  avgDbPercent: number;
};

export type PerformanceHomeQuickStats = {
  requestSummariesInWindow: number;
  avgRequestDurationMs: number | null;
  medianRequestDurationMs: number | null;
  p95RequestDurationMs: number | null;
  avgDbTimePerRequestMs: number | null;
  avgDbPercentOfWallTime: number | null;
  slowDbEventsInWindow: number;
  slowOrErrorQueriesAttributedToRequests: number;
};

/** Live in-memory snapshot for the current process within a rolling window. */
export type PerformanceHomeLive = {
  source: 'live';
  databasePerformanceEnabled: boolean;
  requestTimelineEnabled: boolean;
  /** Width of the rolling window in milliseconds (e.g. 900000 for 15 min). */
  windowMs: number;
  /** Always the local instance for the in-memory aggregator (not cluster/fleet-wide). */
  scope: 'instance';
  generatedAt: string;
  quickStats: PerformanceHomeQuickStats;
  slowestRoutes: PerformanceRouteAgg[];
  topSqlFingerprints: PerformanceFingerprintRow[];
};

export type PerformanceHomeMetrics =
  | {
      source: 'none';
      databasePerformanceEnabled: boolean;
      requestTimelineEnabled: boolean;
      hint: string;
    }
  | PerformanceHomeLive
  | {
      source: 'artifact';
      databasePerformanceEnabled: boolean;
      requestTimelineEnabled: boolean;
      fileFound: boolean;
      linesScanned: number;
      batchesParsed: number;
      lastGeneratedAt: string | null;
      tailWindow: PerformanceWidgetTailWindow;
      quickStats: PerformanceHomeQuickStats;
      /** Slowest routes by average wall time (min 2 samples), capped. */
      slowestRoutes: PerformanceRouteAgg[];
      /** Most frequent slow/error SQL fingerprints in the same tail window. */
      topSqlFingerprints: PerformanceFingerprintRow[];
    };
