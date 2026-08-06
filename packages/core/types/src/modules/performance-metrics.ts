/**
 * Live, in-process performance metrics derived from `performance.*` hub events.
 *
 * This is intentionally a rolling, per-instance snapshot — not a stored time series. The aggregator
 * keeps a bounded in-memory window (fixed-size latency histogram + capped route/SQL maps) and
 * recomputes a snapshot on demand. It reflects only the traffic served by THIS process since the
 * window opened; it is not cluster-wide or restart-surviving. For fleet-wide or historical data,
 * export via OTLP or read the optional performance artifact.
 */

/** One route bucket aggregated from `performance.request.summary` events in the live window. */
export interface PerformanceLiveRoute {
  method: string;
  route: string;
  count: number;
  avgDurationMs: number;
  avgDbMs: number;
  /** Mean of `min(100, dbTotalMs / durationMs * 100)` across requests in this bucket. */
  avgDbPercent: number;
}

/** One slow/error SQL shape aggregated from `performance.db.query.*` events in the live window. */
export interface PerformanceLiveFingerprint {
  fingerprint: string;
  count: number;
  totalMs: number;
}

export interface PerformanceLiveQuickStats {
  /** Number of `performance.request.summary` events folded into the current window. */
  requestSummariesInWindow: number;
  avgRequestDurationMs: number | null;
  /** p50 wall time, estimated from the latency histogram. */
  medianRequestDurationMs: number | null;
  /** p95 wall time, estimated from the latency histogram. */
  p95RequestDurationMs: number | null;
  avgDbTimePerRequestMs: number | null;
  avgDbPercentOfWallTime: number | null;
  /** Count of slow/error DB query events observed in the window. */
  slowDbEventsInWindow: number;
  /** Sum of `slowQueryCount` reported on request summaries in the window. */
  slowOrErrorQueriesAttributedToRequests: number;
}

export interface PerformanceLiveSnapshot {
  /** True when tracking is enabled and the aggregator is subscribed to the hub. */
  active: boolean;
  /** Scope of the data — always the local process for the in-memory aggregator. */
  scope: 'instance';
  /** Width of the rolling window in milliseconds. */
  windowMs: number;
  requestTrackingEnabled: boolean;
  databasePerformanceEnabled: boolean;
  /** ISO timestamp when this snapshot was computed. */
  generatedAt: string;
  quickStats: PerformanceLiveQuickStats;
  /** Slowest routes by average wall time, capped. */
  slowestRoutes: PerformanceLiveRoute[];
  /** Most frequent slow/error SQL fingerprints in the window, capped. */
  topSqlFingerprints: PerformanceLiveFingerprint[];
}

export interface PerformanceLiveMetrics {
  /** True when the aggregator is collecting (tracking and/or DB perf enabled). */
  isActive(): boolean;
  /** Compute a fresh rolling-window snapshot from the current in-memory state. */
  snapshot(): PerformanceLiveSnapshot;
  /** Unsubscribe from the hub and release timers/state. */
  dispose(): void;
}
