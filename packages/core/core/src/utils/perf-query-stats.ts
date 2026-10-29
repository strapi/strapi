export interface PerfQueryAgg {
  count: number;
  totalMs: number;
  slowOrErrorEvents: number;
}

/** Aggregates per-request DB telemetry used for `performance.request.summary`. */
export function mergeQueryTelemetryIntoStats(
  statsMap: Map<string, PerfQueryAgg>,
  requestId: string,
  durationMs: number,
  slowOrErrorEventEmitted: boolean
): void {
  const bucket = statsMap.get(requestId) ?? {
    count: 0,
    totalMs: 0,
    slowOrErrorEvents: 0,
  };

  bucket.count += 1;
  bucket.totalMs += durationMs;
  if (slowOrErrorEventEmitted) {
    bucket.slowOrErrorEvents += 1;
  }

  statsMap.set(requestId, bucket);
}
