import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Core, Modules } from '@strapi/types';

import {
  resolveDatabasePerformanceArtifactMaxFileBytes,
  resolveDatabasePerformanceFlushIntervalMs,
  resolveDatabasePerformanceMaxEvents,
} from './database-config';
import { PERFORMANCE_ARTIFACT_REQUEST_EVENTS, PERFORMANCE_HUB_EVENT } from './hub-events';

/** JSON Lines: one envelope object per line; `schemaVersion` on each line (additive within major). */
export const PERFORMANCE_ARTIFACT_BATCH_SCHEMA_VERSION = 1 as const;

export type PerformanceArtifactDisposed = () => Promise<void>;

type BufferedPerfRow = {
  kind: string;
  emittedAt: string;
  event: unknown;
};

type ArtifactFingerprintAgg = { fingerprint: string; count: number; totalMs: number };

export type PerformanceArtifactSummaryV1 = {
  /** Count of DB perf rows in this batch (slow + error events only in current producers). */
  totalQueriesObserved: number;
  /** Same as `totalQueriesObserved` for this batch — all captured rows are slow or error path. */
  slowQueryCount: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  topFingerprints: ArtifactFingerprintAgg[];
  requestCount?: number;
  slowRequestCount?: number;
};

export type PerformanceArtifactEnvelopeV1 = {
  schemaVersion: typeof PERFORMANCE_ARTIFACT_BATCH_SCHEMA_VERSION;
  generatedAt: string;
  strapiVersion: string;
  nodeVersion: string;
  gitSha?: string;
  config: Record<string, unknown>;
  summary: PerformanceArtifactSummaryV1;
  events: BufferedPerfRow[];
};

const shouldCaptureArtifact = (output: unknown) => output === 'artifact' || output === 'both';

function clampPositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return fallback;
  }
  return value;
}

function pickDefined<T extends Record<string, unknown>>(obj: T | undefined, keys: (keyof T)[]) {
  const out: Record<string, unknown> = {};
  if (!obj) {
    return out;
  }
  for (const k of keys) {
    if (obj[k] !== undefined) {
      out[String(k)] = obj[k];
    }
  }
  return out;
}

function buildRedactedPerfSnapshot(strapi: Core.Strapi): Record<string, unknown> {
  const dbPerf = strapi.config.get('database.performance') as Record<string, unknown> | undefined;
  const srvPerf = strapi.config.get('server.performance') as Record<string, unknown> | undefined;

  return {
    database: pickDefined(dbPerf, [
      'enabled',
      'slowQueryMs',
      'sampleRate',
      'output',
      'captureSqlText',
      'captureBindings',
      'flushIntervalMs',
      'maxEvents',
      'artifactFlushIntervalMs',
      'artifactMaxEvents',
      'artifactMaxFileBytes',
    ]),
    server: pickDefined(srvPerf, [
      'requestSummaryEnabled',
      'requestTrackingEnabled',
      'slowRequestMs',
      'requestSampleRate',
      'emitStageEvents',
    ]),
  };
}

function percentileNearest(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function computeFingerprintRollup(rows: BufferedPerfRow[]): ArtifactFingerprintAgg[] {
  const map = new Map<string, { count: number; totalMs: number }>();

  for (const row of rows) {
    if (
      row.kind !== PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW &&
      row.kind !== PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR
    ) {
      continue;
    }
    const ev = row.event as { queryFingerprint?: string; durationMs?: number };
    const fp = typeof ev.queryFingerprint === 'string' ? ev.queryFingerprint : 'unknown';
    const ms = typeof ev.durationMs === 'number' ? ev.durationMs : 0;
    const cur = map.get(fp) ?? { count: 0, totalMs: 0 };
    cur.count += 1;
    cur.totalMs += ms;
    map.set(fp, cur);
  }

  return [...map.entries()]
    .map(([fingerprint, v]) => ({ fingerprint, count: v.count, totalMs: v.totalMs }))
    .sort((a, b) => b.count - a.count || b.totalMs - a.totalMs)
    .slice(0, 10);
}

export function summarizePerfArtifactBatch(
  rows: BufferedPerfRow[],
  opts: { slowRequestMs: number }
): PerformanceArtifactSummaryV1 {
  const durations: number[] = [];
  let dbEventRows = 0;
  let requestCount = 0;
  let slowRequestCount = 0;

  for (const row of rows) {
    if (
      row.kind === PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW ||
      row.kind === PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR
    ) {
      dbEventRows += 1;
      const ev = row.event as { durationMs?: number };
      if (typeof ev.durationMs === 'number') {
        durations.push(ev.durationMs);
      }
    }
    if (row.kind === PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY) {
      requestCount += 1;
      const ev = row.event as { durationMs?: number };
      if (typeof ev.durationMs === 'number' && ev.durationMs >= opts.slowRequestMs) {
        slowRequestCount += 1;
      }
    }
  }

  durations.sort((a, b) => a - b);

  return {
    totalQueriesObserved: dbEventRows,
    slowQueryCount: dbEventRows,
    p50Ms: percentileNearest(durations, 50),
    p95Ms: percentileNearest(durations, 95),
    p99Ms: percentileNearest(durations, 99),
    topFingerprints: computeFingerprintRollup(rows),
    requestCount: requestCount > 0 ? requestCount : undefined,
    slowRequestCount: requestCount > 0 ? slowRequestCount : undefined,
  };
}

function resolveGitSha(): string | undefined {
  return (
    process.env.GITHUB_SHA ||
    process.env.COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.CIRCLE_SHA1 ||
    undefined
  );
}

/**
 * Buffered performance artifact (JSON Lines): each flush appends one JSON object (single line) to `artifactPath`.
 */
export function attachPerformanceArtifactWriter(strapi: Core.Strapi): PerformanceArtifactDisposed {
  const output = strapi.config.get('database.performance.output', 'none');
  const artifactPath = strapi.config.get('database.performance.artifactPath') as string | undefined;

  if (!shouldCaptureArtifact(output) || !artifactPath) {
    return async () => {
      /* no-op */
    };
  }

  const flushMs = resolveDatabasePerformanceFlushIntervalMs(strapi);
  const maxEvents = resolveDatabasePerformanceMaxEvents(strapi);
  const artifactMaxFileBytes = resolveDatabasePerformanceArtifactMaxFileBytes(strapi);
  const resolvedArtifactPath = path.resolve(artifactPath);
  const slowRequestMs = clampPositiveInt(
    strapi.config.get('server.performance.slowRequestMs'),
    500
  );

  const buffer: BufferedPerfRow[] = [];
  let flushInProgress = false;

  const buildEnvelope = (events: BufferedPerfRow[]): PerformanceArtifactEnvelopeV1 => {
    const gitSha = resolveGitSha();
    return {
      schemaVersion: PERFORMANCE_ARTIFACT_BATCH_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      strapiVersion: String(strapi.config.get('info.strapi') ?? 'unknown'),
      nodeVersion: process.version,
      ...(gitSha ? { gitSha } : {}),
      config: buildRedactedPerfSnapshot(strapi),
      summary: summarizePerfArtifactBatch(events, { slowRequestMs }),
      events,
    };
  };

  const serializeLine = (events: BufferedPerfRow[]) => `${JSON.stringify(buildEnvelope(events))}\n`;

  const maybeRotateArtifactFile = async () => {
    if (artifactMaxFileBytes <= 0) {
      return;
    }
    try {
      const st = await stat(resolvedArtifactPath);
      if (st.isFile() && st.size >= artifactMaxFileBytes) {
        const rotated = `${resolvedArtifactPath}.rotated.${Date.now()}.jsonl`;
        await rename(resolvedArtifactPath, rotated);
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        /* ignore rotation errors — next flush may succeed */
      }
    }
  };

  const flush = async () => {
    if (flushInProgress || buffer.length === 0) {
      return;
    }

    flushInProgress = true;
    const chunk = buffer.splice(0, buffer.length);

    try {
      await mkdir(path.dirname(resolvedArtifactPath), { recursive: true });
      await maybeRotateArtifactFile();
      await writeFile(resolvedArtifactPath, serializeLine(chunk), {
        encoding: 'utf8',
        flag: 'a',
      });
    } catch {
      /* fail-open: monitoring must never take down Strapi */
    } finally {
      flushInProgress = false;
    }
  };

  const subscriber: Modules.EventHub.Subscriber = async (eventName, ...args) => {
    const isDb =
      eventName === PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW ||
      eventName === PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR;
    const isReq = (PERFORMANCE_ARTIFACT_REQUEST_EVENTS as readonly string[]).includes(eventName);

    if (!isDb && !isReq) {
      return;
    }

    buffer.push({
      kind: eventName,
      emittedAt: new Date().toISOString(),
      event: args[0],
    });

    while (buffer.length > maxEvents) {
      buffer.shift();
    }
  };

  const unsubscribe = strapi.eventHub.subscribe(subscriber);

  const flushTimer = setInterval(() => {
    flush().catch(() => {});
  }, flushMs);
  flushTimer.unref?.();

  return async () => {
    clearInterval(flushTimer);
    unsubscribe();
    await flush();
  };
}
