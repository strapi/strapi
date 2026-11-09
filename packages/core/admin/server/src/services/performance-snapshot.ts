import fs from 'node:fs/promises';
import path from 'node:path';

import type { Core } from '@strapi/types';

import type { PerformanceWidgetTailWindow } from '../../../shared/contracts/performance-widget';

export const PERFORMANCE_SNAPSHOT_MAX_TAIL_BYTES = 512 * 1024;
export const PERFORMANCE_SNAPSHOT_MAX_TAIL_LINES = 80;

const MAX_TAIL_BYTES = PERFORMANCE_SNAPSHOT_MAX_TAIL_BYTES;
const MAX_LINES = PERFORMANCE_SNAPSHOT_MAX_TAIL_LINES;

export const PERFORMANCE_ARTIFACT_TAIL_WINDOW: PerformanceWidgetTailWindow = {
  maxNonEmptyLines: MAX_LINES,
  maxTailBytes: MAX_TAIL_BYTES,
};

export function isArtifactOutput(output: unknown): boolean {
  return output === 'artifact' || output === 'both';
}

/** Reject artifact paths outside the application root (path traversal / sensitive files). */
export function isArtifactPathUnderAppRoot(appRoot: string, artifactPath: string): boolean {
  const resolved = path.resolve(artifactPath);
  const root = path.resolve(appRoot);
  const rel = path.relative(root, resolved);
  return rel !== '' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

export async function readPerformanceArtifactTailLines(
  resolvedArtifactPath: string
): Promise<string[]> {
  const stat = await fs.stat(resolvedArtifactPath).catch(() => null);
  if (!stat || stat.size === 0) {
    return [];
  }

  const start = Math.max(0, stat.size - MAX_TAIL_BYTES);
  const length = stat.size - start;
  const handle = await fs.open(resolvedArtifactPath, 'r');
  try {
    const buf = Buffer.alloc(length);
    await handle.read(buf, 0, length, start);
    const text = buf.toString('utf8');
    const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return rawLines.slice(-MAX_LINES);
  } finally {
    await handle.close();
  }
}

export type PerformanceArtifactReadResult =
  | {
      ok: false;
      source: 'none';
      hint: string;
      databasePerformanceEnabled: boolean;
      requestTimelineEnabled: boolean;
    }
  | {
      ok: true;
      source: 'artifact';
      resolvedPath: string;
      lines: string[];
      databasePerformanceEnabled: boolean;
      requestTimelineEnabled: boolean;
    };

export async function readPerformanceArtifactContext(
  strapi: Core.Strapi
): Promise<PerformanceArtifactReadResult> {
  const output = strapi.config.get('database.performance.output', 'none');
  const artifactPath = strapi.config.get('database.performance.artifactPath') as string | undefined;
  const databasePerformanceEnabled = strapi.config.get('database.performance.enabled') === true;
  const requestTimelineEnabled =
    strapi.config.get('server.performance.requestTrackingEnabled') === true;

  if (!isArtifactOutput(output) || !artifactPath || typeof artifactPath !== 'string') {
    return {
      ok: false,
      source: 'none',
      hint: 'Enable database.performance.output (artifact or both) and set database.performance.artifactPath to record batches the widgets can read.',
      databasePerformanceEnabled,
      requestTimelineEnabled,
    };
  }

  const appRoot = strapi.dirs.app.root;
  if (!isArtifactPathUnderAppRoot(appRoot, artifactPath)) {
    return {
      ok: false,
      source: 'none',
      hint: 'Performance artifact path must be inside the application directory.',
      databasePerformanceEnabled,
      requestTimelineEnabled,
    };
  }

  const resolvedPath = path.resolve(artifactPath);
  const lines = await readPerformanceArtifactTailLines(resolvedPath).catch(() => []);

  return {
    ok: true,
    source: 'artifact',
    resolvedPath,
    lines,
    databasePerformanceEnabled,
    requestTimelineEnabled,
  };
}
