import type { Core, Modules } from '@strapi/types';

import { PERFORMANCE_HUB_EVENT } from './hub-events';
import { isServerRequestPerfTrackingEnabled } from '../../utils/server-performance-tracking';

/**
 * In-memory rolling aggregator for `performance.*` hub events.
 *
 * Design goals: zero storage, flat memory, O(1) ingest. The window is split into fixed time slices
 * arranged in a ring; each slice holds a small latency histogram plus capped route/SQL maps. A
 * snapshot merges the live slices on read. Percentiles come from the histogram, so we never retain
 * raw per-request samples. State is per-process and resets on restart — honest for a "right now,
 * this instance" homepage widget.
 */

const SLICE_MS = 60_000;
const SLICE_COUNT = 15;
const WINDOW_MS = SLICE_MS * SLICE_COUNT;

/** Hard caps so a high-cardinality route/fingerprint space can't grow memory without bound. */
const MAX_ROUTES_PER_SLICE = 256;
const MAX_FINGERPRINTS_PER_SLICE = 256;

const TOP_ROUTES = 6;
const TOP_FINGERPRINTS = 5;

/**
 * Upper bounds (ms) for the latency histogram buckets; a final implicit overflow bucket catches
 * anything larger. Roughly geometric so resolution is good in the sub-second range that matters most.
 */
const HISTOGRAM_BOUNDS_MS = [
  1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946,
] as const;
const BUCKET_COUNT = HISTOGRAM_BOUNDS_MS.length + 1;

type RouteAgg = {
  method: string;
  route: string;
  count: number;
  sumDuration: number;
  sumDb: number;
  sumDbPercent: number;
};

type FingerprintAgg = { count: number; totalMs: number };

type Slice = {
  /** Epoch-minute index this slice currently represents; `-1` means unused/stale. */
  minute: number;
  requestCount: number;
  sumDuration: number;
  sumDb: number;
  sumDbPercent: number;
  slowQuerySum: number;
  slowDbEvents: number;
  histogram: number[];
  routes: Map<string, RouteAgg>;
  fingerprints: Map<string, FingerprintAgg>;
};

function freshSlice(minute: number): Slice {
  return {
    minute,
    requestCount: 0,
    sumDuration: 0,
    sumDb: 0,
    sumDbPercent: 0,
    slowQuerySum: 0,
    slowDbEvents: 0,
    histogram: new Array<number>(BUCKET_COUNT).fill(0),
    routes: new Map(),
    fingerprints: new Map(),
  };
}

function bucketIndex(durationMs: number): number {
  for (let i = 0; i < HISTOGRAM_BOUNDS_MS.length; i += 1) {
    if (durationMs <= HISTOGRAM_BOUNDS_MS[i]) {
      return i;
    }
  }
  return BUCKET_COUNT - 1;
}

function percentileFromHistogram(histogram: number[], total: number, p: number): number | null {
  if (total === 0) {
    return null;
  }
  const target = (p / 100) * total;
  let cumulative = 0;
  for (let i = 0; i < histogram.length; i += 1) {
    cumulative += histogram[i];
    if (cumulative >= target) {
      return i < HISTOGRAM_BOUNDS_MS.length
        ? HISTOGRAM_BOUNDS_MS[i]
        : HISTOGRAM_BOUNDS_MS[HISTOGRAM_BOUNDS_MS.length - 1];
    }
  }
  return HISTOGRAM_BOUNDS_MS[HISTOGRAM_BOUNDS_MS.length - 1];
}

function dbWallPercent(durationMs: number, dbTotalMs: number): number {
  if (durationMs > 0) {
    return Math.min(100, (dbTotalMs / durationMs) * 100);
  }
  return dbTotalMs > 0 ? 100 : 0;
}

function emptySnapshot(
  requestTrackingEnabled: boolean,
  databasePerformanceEnabled: boolean,
  active: boolean
): Modules.PerformanceMetrics.PerformanceLiveSnapshot {
  return {
    active,
    scope: 'instance',
    windowMs: WINDOW_MS,
    requestTrackingEnabled,
    databasePerformanceEnabled,
    generatedAt: new Date().toISOString(),
    quickStats: {
      requestSummariesInWindow: 0,
      avgRequestDurationMs: null,
      medianRequestDurationMs: null,
      p95RequestDurationMs: null,
      avgDbTimePerRequestMs: null,
      avgDbPercentOfWallTime: null,
      slowDbEventsInWindow: 0,
      slowOrErrorQueriesAttributedToRequests: 0,
    },
    slowestRoutes: [],
    topSqlFingerprints: [],
  };
}

/**
 * Creates the live metrics aggregator. When neither request tracking nor DB performance capture is
 * enabled, returns an inert aggregator that never subscribes and reports `active: false`.
 */
export function createPerformanceLiveMetrics(
  strapi: Core.Strapi
): Modules.PerformanceMetrics.PerformanceLiveMetrics {
  const requestTrackingEnabled = isServerRequestPerfTrackingEnabled(strapi);
  const databasePerformanceEnabled = strapi.config.get('database.performance.enabled') === true;
  const active = requestTrackingEnabled || databasePerformanceEnabled;

  if (!active) {
    return {
      isActive: () => false,
      snapshot: () => emptySnapshot(requestTrackingEnabled, databasePerformanceEnabled, false),
      dispose() {},
    };
  }

  const ring: Slice[] = Array.from({ length: SLICE_COUNT }, () => freshSlice(-1));

  const currentMinute = () => Math.floor(Date.now() / SLICE_MS);

  const sliceForWrite = (minute: number): Slice => {
    const idx = ((minute % SLICE_COUNT) + SLICE_COUNT) % SLICE_COUNT;
    const slice = ring[idx];
    if (slice.minute !== minute) {
      ring[idx] = freshSlice(minute);
      return ring[idx];
    }
    return slice;
  };

  const recordRequestSummary = (event: {
    durationMs?: number;
    dbTotalMs?: number;
    method?: string;
    route?: string;
    slowQueryCount?: number;
  }) => {
    const durationMs = typeof event.durationMs === 'number' ? event.durationMs : 0;
    const dbTotalMs = typeof event.dbTotalMs === 'number' ? event.dbTotalMs : 0;
    const method = typeof event.method === 'string' ? event.method : '';
    const route = typeof event.route === 'string' && event.route ? event.route : '(unknown route)';
    const slowQueryCount = typeof event.slowQueryCount === 'number' ? event.slowQueryCount : 0;
    const pct = dbWallPercent(durationMs, dbTotalMs);

    const slice = sliceForWrite(currentMinute());
    slice.requestCount += 1;
    slice.sumDuration += durationMs;
    slice.sumDb += dbTotalMs;
    slice.sumDbPercent += pct;
    slice.slowQuerySum += slowQueryCount;
    slice.histogram[bucketIndex(durationMs)] += 1;

    const key = `${method}\t${route}`;
    let bucket = slice.routes.get(key);
    if (!bucket) {
      if (slice.routes.size >= MAX_ROUTES_PER_SLICE) {
        return;
      }
      bucket = { method, route, count: 0, sumDuration: 0, sumDb: 0, sumDbPercent: 0 };
      slice.routes.set(key, bucket);
    }
    bucket.count += 1;
    bucket.sumDuration += durationMs;
    bucket.sumDb += dbTotalMs;
    bucket.sumDbPercent += pct;
  };

  const recordDbQuery = (event: { queryFingerprint?: string; durationMs?: number }) => {
    const slice = sliceForWrite(currentMinute());
    slice.slowDbEvents += 1;

    const fingerprint =
      typeof event.queryFingerprint === 'string' ? event.queryFingerprint : 'unknown';
    const ms = typeof event.durationMs === 'number' ? event.durationMs : 0;
    let agg = slice.fingerprints.get(fingerprint);
    if (!agg) {
      if (slice.fingerprints.size >= MAX_FINGERPRINTS_PER_SLICE) {
        return;
      }
      agg = { count: 0, totalMs: 0 };
      slice.fingerprints.set(fingerprint, agg);
    }
    agg.count += 1;
    agg.totalMs += ms;
  };

  const subscriber: Modules.EventHub.Subscriber = async (eventName, ...args) => {
    if (eventName === PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY) {
      recordRequestSummary((args[0] ?? {}) as Parameters<typeof recordRequestSummary>[0]);
      return;
    }
    if (
      eventName === PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW ||
      eventName === PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR
    ) {
      recordDbQuery((args[0] ?? {}) as Parameters<typeof recordDbQuery>[0]);
    }
  };

  const unsubscribe = strapi.eventHub.subscribe(subscriber);

  const snapshot = (): Modules.PerformanceMetrics.PerformanceLiveSnapshot => {
    const minute = currentMinute();
    const oldestValid = minute - (SLICE_COUNT - 1);

    let requestCount = 0;
    let sumDuration = 0;
    let sumDb = 0;
    let sumDbPercent = 0;
    let slowQuerySum = 0;
    let slowDbEvents = 0;
    const histogram = new Array<number>(BUCKET_COUNT).fill(0);
    const routes = new Map<string, RouteAgg>();
    const fingerprints = new Map<string, FingerprintAgg>();

    const liveSlices = ring.filter(
      (slice) => slice.minute >= oldestValid && slice.minute <= minute
    );

    for (const slice of liveSlices) {
      requestCount += slice.requestCount;
      sumDuration += slice.sumDuration;
      sumDb += slice.sumDb;
      sumDbPercent += slice.sumDbPercent;
      slowQuerySum += slice.slowQuerySum;
      slowDbEvents += slice.slowDbEvents;
      for (let i = 0; i < BUCKET_COUNT; i += 1) {
        histogram[i] += slice.histogram[i];
      }
      for (const [key, agg] of slice.routes) {
        const merged = routes.get(key);
        if (!merged) {
          routes.set(key, { ...agg });
        } else {
          merged.count += agg.count;
          merged.sumDuration += agg.sumDuration;
          merged.sumDb += agg.sumDb;
          merged.sumDbPercent += agg.sumDbPercent;
        }
      }
      for (const [key, agg] of slice.fingerprints) {
        const merged = fingerprints.get(key);
        if (!merged) {
          fingerprints.set(key, { ...agg });
        } else {
          merged.count += agg.count;
          merged.totalMs += agg.totalMs;
        }
      }
    }

    const slowestRoutes: Modules.PerformanceMetrics.PerformanceLiveRoute[] = [...routes.values()]
      .map((r) => ({
        method: r.method,
        route: r.route,
        count: r.count,
        avgDurationMs: r.count > 0 ? r.sumDuration / r.count : 0,
        avgDbMs: r.count > 0 ? r.sumDb / r.count : 0,
        avgDbPercent: r.count > 0 ? r.sumDbPercent / r.count : 0,
      }))
      .sort((a, b) => b.avgDurationMs - a.avgDurationMs || b.count - a.count)
      .slice(0, TOP_ROUTES);

    const topSqlFingerprints: Modules.PerformanceMetrics.PerformanceLiveFingerprint[] = [
      ...fingerprints.entries(),
    ]
      .map(([fingerprint, agg]) => ({ fingerprint, count: agg.count, totalMs: agg.totalMs }))
      .sort((a, b) => b.count - a.count || b.totalMs - a.totalMs)
      .slice(0, TOP_FINGERPRINTS);

    return {
      active: true,
      scope: 'instance',
      windowMs: WINDOW_MS,
      requestTrackingEnabled,
      databasePerformanceEnabled,
      generatedAt: new Date().toISOString(),
      quickStats: {
        requestSummariesInWindow: requestCount,
        avgRequestDurationMs: requestCount > 0 ? sumDuration / requestCount : null,
        medianRequestDurationMs: percentileFromHistogram(histogram, requestCount, 50),
        p95RequestDurationMs: percentileFromHistogram(histogram, requestCount, 95),
        avgDbTimePerRequestMs: requestCount > 0 ? sumDb / requestCount : null,
        avgDbPercentOfWallTime: requestCount > 0 ? sumDbPercent / requestCount : null,
        slowDbEventsInWindow: slowDbEvents,
        slowOrErrorQueriesAttributedToRequests: slowQuerySum,
      },
      slowestRoutes,
      topSqlFingerprints,
    };
  };

  return {
    isActive: () => true,
    snapshot,
    dispose() {
      unsubscribe();
    },
  };
}
