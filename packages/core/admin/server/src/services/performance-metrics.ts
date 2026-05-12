import type { Core } from '@strapi/types';
import { arithmeticMean, percentileNearestSorted } from '@strapi/utils';

import type {
  PerformanceFingerprintRow,
  PerformanceHomeMetrics,
  PerformanceHomeQuickStats,
  PerformanceRouteAgg,
} from '../../../shared/contracts/performance-metrics';

import {
  PERFORMANCE_ARTIFACT_TAIL_WINDOW,
  readPerformanceArtifactContext,
} from './performance-snapshot';

const KIND = {
  REQUEST_SUMMARY: 'performance.request.summary',
  DB_QUERY_SLOW: 'performance.db.query.slow',
  DB_QUERY_ERROR: 'performance.db.query.error',
} as const;

type BufferedRow = { kind?: string; event?: unknown };

type RouteBucket = {
  method: string;
  route: string;
  durations: number[];
  dbTotals: number[];
  dbPercents: number[];
};

function routeKey(method: string, route: string): string {
  return `${method}\t${route}`;
}

function finalizeQuickStats(input: {
  durations: number[];
  dbTotals: number[];
  dbPercents: number[];
  slowDbEvents: number;
  slowQueriesInSummaries: number;
}): PerformanceHomeQuickStats {
  const sorted = [...input.durations].sort((a, b) => a - b);
  return {
    requestSummariesInWindow: input.durations.length,
    avgRequestDurationMs: arithmeticMean(input.durations),
    medianRequestDurationMs: percentileNearestSorted(sorted, 50),
    p95RequestDurationMs: percentileNearestSorted(sorted, 95),
    avgDbTimePerRequestMs: arithmeticMean(input.dbTotals),
    avgDbPercentOfWallTime: arithmeticMean(input.dbPercents),
    slowDbEventsInWindow: input.slowDbEvents,
    slowOrErrorQueriesAttributedToRequests: input.slowQueriesInSummaries,
  };
}

function topFingerprintsFromMap(
  map: Map<string, { count: number; totalMs: number }>,
  limit: number
): PerformanceFingerprintRow[] {
  return [...map.entries()]
    .map(([fingerprint, v]) => ({ fingerprint, count: v.count, totalMs: v.totalMs }))
    .sort((a, b) => b.count - a.count || b.totalMs - a.totalMs)
    .slice(0, limit);
}

function finalizeRoutes(map: Map<string, RouteBucket>, limit: number): PerformanceRouteAgg[] {
  const rows: PerformanceRouteAgg[] = [];
  for (const b of map.values()) {
    if (b.durations.length > 0) {
      const avgDurationMs = arithmeticMean(b.durations) ?? 0;
      const avgDbMs = arithmeticMean(b.dbTotals) ?? 0;
      const avgDbPercent = arithmeticMean(b.dbPercents) ?? 0;
      rows.push({
        method: b.method,
        route: b.route,
        count: b.durations.length,
        avgDurationMs,
        avgDbMs,
        avgDbPercent,
      });
    }
  }
  rows.sort((a, b) => b.avgDurationMs - a.avgDurationMs || b.count - a.count);
  return rows.slice(0, limit);
}

export async function buildPerformanceHomeMetrics(
  strapi: Core.Strapi
): Promise<PerformanceHomeMetrics> {
  const ctx = await readPerformanceArtifactContext(strapi);

  if (!ctx.ok) {
    return {
      source: 'none',
      hint: ctx.hint,
      databasePerformanceEnabled: ctx.databasePerformanceEnabled,
      requestTimelineEnabled: ctx.requestTimelineEnabled,
    };
  }

  const { lines, databasePerformanceEnabled, requestTimelineEnabled } = ctx;

  if (lines.length === 0) {
    return {
      source: 'artifact',
      databasePerformanceEnabled,
      requestTimelineEnabled,
      fileFound: false,
      linesScanned: 0,
      batchesParsed: 0,
      lastGeneratedAt: null,
      tailWindow: PERFORMANCE_ARTIFACT_TAIL_WINDOW,
      quickStats: finalizeQuickStats({
        durations: [],
        dbTotals: [],
        dbPercents: [],
        slowDbEvents: 0,
        slowQueriesInSummaries: 0,
      }),
      slowestRoutes: [],
      topSqlFingerprints: [],
    };
  }

  const durations: number[] = [];
  const dbTotals: number[] = [];
  const dbPercents: number[] = [];
  let slowDbEvents = 0;
  let slowQueriesInSummaries = 0;
  let batchesParsed = 0;
  let lastGeneratedAt: string | null = null;

  const routeMap = new Map<string, RouteBucket>();
  const fpMap = new Map<string, { count: number; totalMs: number }>();

  for (const line of lines) {
    let row:
      | {
          schemaVersion?: number;
          generatedAt?: string;
          events?: BufferedRow[];
        }
      | undefined;
    try {
      row = JSON.parse(line) as {
        schemaVersion?: number;
        generatedAt?: string;
        events?: BufferedRow[];
      };
    } catch {
      row = undefined;
    }

    if (row?.schemaVersion !== 1 || !Array.isArray(row.events)) {
      /* skip malformed or non-v1 batches */
    } else {
      batchesParsed += 1;
      if (typeof row.generatedAt === 'string') {
        if (!lastGeneratedAt || row.generatedAt > lastGeneratedAt) {
          lastGeneratedAt = row.generatedAt;
        }
      }

      for (const cell of row.events) {
        const kind = cell.kind;
        if (kind === KIND.DB_QUERY_SLOW || kind === KIND.DB_QUERY_ERROR) {
          slowDbEvents += 1;
          const ev = cell.event as { queryFingerprint?: string; durationMs?: number };
          const fp = typeof ev.queryFingerprint === 'string' ? ev.queryFingerprint : 'unknown';
          const ms = typeof ev.durationMs === 'number' ? ev.durationMs : 0;
          const cur = fpMap.get(fp) ?? { count: 0, totalMs: 0 };
          cur.count += 1;
          cur.totalMs += ms;
          fpMap.set(fp, cur);
        }

        if (kind === KIND.REQUEST_SUMMARY) {
          const ev = cell.event as {
            durationMs?: number;
            dbTotalMs?: number;
            method?: string;
            route?: string;
            slowQueryCount?: number;
            slowOrErrorQueryEvents?: number;
          };
          const durationMs = typeof ev.durationMs === 'number' ? ev.durationMs : 0;
          const dbTotalMs = typeof ev.dbTotalMs === 'number' ? ev.dbTotalMs : 0;
          const method = typeof ev.method === 'string' ? ev.method : '';
          const route = typeof ev.route === 'string' ? ev.route : '';
          const slowQ =
            (typeof ev.slowQueryCount === 'number' ? ev.slowQueryCount : undefined) ??
            (typeof ev.slowOrErrorQueryEvents === 'number'
              ? ev.slowOrErrorQueryEvents
              : undefined) ??
            0;

          durations.push(durationMs);
          dbTotals.push(dbTotalMs);
          let dbWallPercent = 0;
          if (durationMs > 0) {
            dbWallPercent = Math.min(100, (dbTotalMs / durationMs) * 100);
          } else if (dbTotalMs > 0) {
            dbWallPercent = 100;
          }
          dbPercents.push(dbWallPercent);
          slowQueriesInSummaries += slowQ;

          const key = routeKey(method, route || '(unknown route)');
          let bucket = routeMap.get(key);
          if (!bucket) {
            bucket = {
              method,
              route: route || '(unknown route)',
              durations: [],
              dbTotals: [],
              dbPercents: [],
            };
            routeMap.set(key, bucket);
          }
          bucket.durations.push(durationMs);
          bucket.dbTotals.push(dbTotalMs);
          bucket.dbPercents.push(dbWallPercent);
        }
      }
    }
  }

  return {
    source: 'artifact',
    databasePerformanceEnabled,
    requestTimelineEnabled,
    fileFound: true,
    linesScanned: lines.length,
    batchesParsed,
    lastGeneratedAt,
    tailWindow: PERFORMANCE_ARTIFACT_TAIL_WINDOW,
    quickStats: finalizeQuickStats({
      durations,
      dbTotals,
      dbPercents,
      slowDbEvents,
      slowQueriesInSummaries,
    }),
    slowestRoutes: finalizeRoutes(routeMap, 6),
    topSqlFingerprints: topFingerprintsFromMap(fpMap, 5),
  };
}
