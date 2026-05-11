import type { Core } from '@strapi/types';

/** Preferred `database.performance.flushIntervalMs`; legacy `artifactFlushIntervalMs`. */
export const DEFAULT_DATABASE_PERF_FLUSH_INTERVAL_MS = 5000;

/** Preferred `database.performance.maxEvents`; legacy `artifactMaxEvents`. */
export const DEFAULT_DATABASE_PERF_MAX_EVENTS = 10_000;

export function resolveDatabasePerformanceFlushIntervalMs(strapi: Core.Strapi): number {
  const preferred = strapi.config.get('database.performance.flushIntervalMs');
  if (typeof preferred === 'number' && preferred > 0) {
    return preferred;
  }
  const legacy = strapi.config.get(
    'database.performance.artifactFlushIntervalMs',
    DEFAULT_DATABASE_PERF_FLUSH_INTERVAL_MS
  );
  return typeof legacy === 'number' && legacy > 0
    ? legacy
    : DEFAULT_DATABASE_PERF_FLUSH_INTERVAL_MS;
}

export function resolveDatabasePerformanceMaxEvents(strapi: Core.Strapi): number {
  const preferred = strapi.config.get('database.performance.maxEvents');
  if (typeof preferred === 'number' && preferred > 0) {
    return preferred;
  }
  const legacy = strapi.config.get(
    'database.performance.artifactMaxEvents',
    DEFAULT_DATABASE_PERF_MAX_EVENTS
  );
  return typeof legacy === 'number' && legacy > 0 ? legacy : DEFAULT_DATABASE_PERF_MAX_EVENTS;
}

/** `0` = no file rotation; positive = rotate when the artifact reaches this size (bytes) before append. */
export function resolveDatabasePerformanceArtifactMaxFileBytes(strapi: Core.Strapi): number {
  const v = strapi.config.get('database.performance.artifactMaxFileBytes');
  if (typeof v === 'number' && v > 0) {
    return v;
  }
  return 0;
}
