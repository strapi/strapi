import fs from 'node:fs/promises';
import path from 'node:path';

import type { Core } from '@strapi/types';

import type {
  PerformanceWidgetFingerprint,
  PerformanceWidgetSnapshot,
} from '../../../shared/contracts/performance-widget';

const MAX_TAIL_BYTES = 512 * 1024;
const MAX_LINES = 80;

function isArtifactOutput(output: unknown): boolean {
  return output === 'artifact' || output === 'both';
}

/** Reject artifact paths outside the application root (path traversal / sensitive files). */
export function isArtifactPathUnderAppRoot(appRoot: string, artifactPath: string): boolean {
  const resolved = path.resolve(artifactPath);
  const root = path.resolve(appRoot);
  const rel = path.relative(root, resolved);
  return rel !== '' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

function mergeFingerprintRollups(
  maps: Array<Map<string, { count: number; totalMs: number }>>
): PerformanceWidgetFingerprint[] {
  const merged = new Map<string, { count: number; totalMs: number }>();
  for (const m of maps) {
    for (const [fp, v] of m) {
      const cur = merged.get(fp) ?? { count: 0, totalMs: 0 };
      cur.count += v.count;
      cur.totalMs += v.totalMs;
      merged.set(fp, cur);
    }
  }
  return [...merged.entries()]
    .map(([fingerprint, v]) => ({ fingerprint, count: v.count, totalMs: v.totalMs }))
    .sort((a, b) => b.count - a.count || b.totalMs - a.totalMs)
    .slice(0, 5);
}

async function readTailLines(filePath: string): Promise<string[]> {
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat || stat.size === 0) {
    return [];
  }

  const start = Math.max(0, stat.size - MAX_TAIL_BYTES);
  const length = stat.size - start;
  const handle = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(length);
    await handle.read(buf, 0, length, start);
    const text = buf.toString('utf8');
    const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const lines = rawLines.slice(-MAX_LINES);
    return lines;
  } finally {
    await handle.close();
  }
}

export async function buildPerformanceWidgetSnapshot(
  strapi: Core.Strapi
): Promise<PerformanceWidgetSnapshot> {
  const output = strapi.config.get('database.performance.output', 'none');
  const artifactPath = strapi.config.get('database.performance.artifactPath') as string | undefined;
  const dbPerfEnabled = strapi.config.get('database.performance.enabled') === true;
  const requestTimelineEnabled =
    strapi.config.get('server.performance.requestSummaryEnabled') === true ||
    strapi.config.get('server.performance.requestTrackingEnabled') === true;

  if (!isArtifactOutput(output) || !artifactPath || typeof artifactPath !== 'string') {
    return {
      source: 'none',
      artifact: { configured: false },
      databasePerformanceEnabled: dbPerfEnabled,
      requestTimelineEnabled,
      hint: 'Enable database.performance.output (artifact or both) and set database.performance.artifactPath to record batches the widget can read.',
    };
  }

  const appRoot = strapi.dirs.app.root;
  if (!isArtifactPathUnderAppRoot(appRoot, artifactPath)) {
    return {
      source: 'none',
      artifact: { configured: false },
      databasePerformanceEnabled: dbPerfEnabled,
      requestTimelineEnabled,
      hint: 'Performance artifact path must be inside the application directory.',
    };
  }

  const resolved = path.resolve(artifactPath);
  const lines = await readTailLines(resolved).catch(() => []);

  if (lines.length === 0) {
    return {
      source: 'artifact',
      artifact: {
        configured: true,
        fileFound: false,
        batchesParsed: 0,
        lastGeneratedAt: null,
        totals: {
          slowQueryCount: 0,
          requestCount: 0,
          slowRequestCount: 0,
          maxP95Ms: 0,
          maxP99Ms: 0,
        },
        topFingerprints: [],
      },
      databasePerformanceEnabled: dbPerfEnabled,
      requestTimelineEnabled,
    };
  }

  let slowQueryCount = 0;
  let requestCount = 0;
  let slowRequestCount = 0;
  let maxP95Ms = 0;
  let maxP99Ms = 0;
  let lastGeneratedAt: string | null = null;
  const fingerprintMaps: Map<string, { count: number; totalMs: number }>[] = [];

  let parsed = 0;
  for (const line of lines) {
    try {
      const row = JSON.parse(line) as {
        schemaVersion?: number;
        generatedAt?: string;
        summary?: {
          slowQueryCount?: number;
          requestCount?: number;
          slowRequestCount?: number;
          p95Ms?: number;
          p99Ms?: number;
          topFingerprints?: PerformanceWidgetFingerprint[];
        };
      };
      if (row.schemaVersion === 1 && row.summary) {
        parsed += 1;
        const s = row.summary;
        slowQueryCount += Number(s.slowQueryCount) || 0;
        requestCount += Number(s.requestCount) || 0;
        slowRequestCount += Number(s.slowRequestCount) || 0;
        maxP95Ms = Math.max(maxP95Ms, Number(s.p95Ms) || 0);
        maxP99Ms = Math.max(maxP99Ms, Number(s.p99Ms) || 0);
        if (typeof row.generatedAt === 'string') {
          lastGeneratedAt = row.generatedAt;
        }
        if (Array.isArray(s.topFingerprints) && s.topFingerprints.length > 0) {
          const m = new Map<string, { count: number; totalMs: number }>();
          for (const fp of s.topFingerprints) {
            if (fp && typeof fp.fingerprint === 'string') {
              m.set(fp.fingerprint, {
                count: Number(fp.count) || 0,
                totalMs: Number(fp.totalMs) || 0,
              });
            }
          }
          fingerprintMaps.push(m);
        }
      }
    } catch {
      /* skip malformed tail fragments */
    }
  }

  return {
    source: 'artifact',
    artifact: {
      configured: true,
      fileFound: true,
      batchesParsed: parsed,
      lastGeneratedAt,
      totals: {
        slowQueryCount,
        requestCount,
        slowRequestCount,
        maxP95Ms,
        maxP99Ms,
      },
      topFingerprints: mergeFingerprintRollups(fingerprintMaps),
    },
    databasePerformanceEnabled: dbPerfEnabled,
    requestTimelineEnabled,
  };
}
